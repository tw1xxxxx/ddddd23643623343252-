using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/files")]
    public class FilesController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<FilesController> _logger;
        
        public FilesController(IWebHostEnvironment env, ILogger<FilesController> logger)
        {
            _env = env;
            _logger = logger;
        }
        
        /// <summary>
        /// Сохраняет JSON файл в папку wwwroot
        /// </summary>
        /// <param name="filename">Имя файла (например: theme.json, menu.json)</param>
        /// <param name="data">Данные для сохранения (любой JSON объект)</param>
        /// <returns>Результат операции</returns>
        [HttpPost("{filename}")]
        [RequestSizeLimit(100 * 1024 * 1024)] // 100MB лимит для этого endpoint (для больших JSON с base64 изображениями)
        public async Task<IActionResult> SaveFile(string filename, [FromBody] object data)
        {
            _logger.LogInformation($"📥 FilesController: Получен запрос POST /api/files/{filename}");
            try
            {
                // Проверка безопасности имени файла
                if (string.IsNullOrEmpty(filename))
                {
                    return BadRequest(new { success = false, message = "Имя файла не может быть пустым" });
                }
                
                // Разрешаем только .json файлы
                if (!filename.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new { success = false, message = "Разрешены только файлы .json" });
                }
                
                // Проверка на попытку выхода за пределы директории (защита от path traversal)
                if (filename.Contains("..") || filename.Contains("/") || filename.Contains("\\"))
                {
                    return BadRequest(new { success = false, message = "Недопустимое имя файла" });
                }
                
                // Определяем путь для сохранения файлов
                // В development: Backend/ClientApp/public/
                // В production: wwwroot/ (для доступа через статические файлы)
                string publicPath = null;
                
                if (_env.IsDevelopment())
                {
                    // В development сохраняем в ClientApp/public
                    var clientAppPath = Path.Combine(_env.ContentRootPath, "ClientApp");
                    publicPath = Path.Combine(clientAppPath, "public");
                    
                    // Создаем папки, если их нет
                    if (!Directory.Exists(clientAppPath))
                    {
                        Directory.CreateDirectory(clientAppPath);
                    }
                    if (!Directory.Exists(publicPath))
                    {
                        Directory.CreateDirectory(publicPath);
                    }
                }
                else
                {
                    // В production сохраняем в wwwroot
                    publicPath = _env.WebRootPath;
                    if (string.IsNullOrEmpty(publicPath))
                    {
                        publicPath = Path.Combine(_env.ContentRootPath, "wwwroot");
                    }
                    
                    // Создаем папку, если её нет
                    if (!Directory.Exists(publicPath))
                    {
                        Directory.CreateDirectory(publicPath);
                    }
                }
                
                if (publicPath == null || !Directory.Exists(publicPath))
                {
                    return BadRequest(new { 
                        success = false, 
                        message = $"Не удалось создать папку для сохранения. Путь: {publicPath}" 
                    });
                }
                
                var filePath = Path.Combine(publicPath, filename);
                
                // Сериализуем данные с форматированием (красивый JSON)
                var options = new JsonSerializerOptions
                {
                    WriteIndented = true,
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                };
                
                var json = JsonSerializer.Serialize(data, options);
                
                // Сохраняем файл асинхронно
                await System.IO.File.WriteAllTextAsync(filePath, json, Encoding.UTF8);
                
                _logger.LogInformation($"Файл {filename} успешно сохранен в {filePath}");
                
                return Ok(new { 
                    success = true, 
                    message = $"Файл {filename} успешно сохранен",
                    path = filePath
                });
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, $"Ошибка сериализации JSON для файла {filename}");
                return BadRequest(new { 
                    success = false, 
                    message = $"Ошибка обработки данных: {ex.Message}" 
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogError(ex, $"Нет прав доступа для сохранения файла {filename}");
                return StatusCode(403, new { 
                    success = false, 
                    message = "Нет прав доступа для сохранения файла" 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Ошибка сохранения файла {filename}");
                return StatusCode(500, new { 
                    success = false, 
                    message = $"Ошибка сохранения файла: {ex.Message}" 
                });
            }
        }
        
        /// <summary>
        /// Получает список всех JSON файлов в wwwroot
        /// </summary>
        [HttpGet("list")]
        public IActionResult GetFilesList()
        {
            try
            {
                var wwwrootPath = _env.WebRootPath;
                if (string.IsNullOrEmpty(wwwrootPath) || !Directory.Exists(wwwrootPath))
                {
                    return Ok(new { success = true, files = new string[0] });
                }
                
                var files = Directory.GetFiles(wwwrootPath, "*.json")
                    .Select(f => Path.GetFileName(f))
                    .ToArray();
                
                return Ok(new { success = true, files });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка получения списка файлов");
                return StatusCode(500, new { 
                    success = false, 
                    message = $"Ошибка получения списка файлов: {ex.Message}" 
                });
            }
        }
    }
}

