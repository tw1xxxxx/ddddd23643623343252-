using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Net.Http;

var builder = WebApplication.CreateBuilder(args);

// Настройка максимального размера запроса для больших JSON файлов с base64 изображениями
// В production это особенно важно, так как фотографии сохраняются в base64 формате
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 100 * 1024 * 1024; // 100MB
    options.ValueLengthLimit = 100 * 1024 * 1024; // 100MB
});

// Настройка Kestrel для больших запросов
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 100 * 1024 * 1024; // 100MB
});

// Добавляем сервисы
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Добавляем CORS
builder.Services.AddCors(options =>
{
    if (builder.Environment.IsDevelopment())
    {
        // В development разрешаем локальные адреса
        options.AddDefaultPolicy(policy =>
        {
            policy.WithOrigins("http://localhost:3000", "https://localhost:7227", "http://localhost:5000")
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        });
    }
    else
    {
        // В production разрешаем запросы с любого домена (можно ограничить конкретными доменами)
        options.AddDefaultPolicy(policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
            
            // Если нужно ограничить конкретными доменами, раскомментируйте и укажите домены:
            // policy.WithOrigins("https://yourdomain.com", "https://www.yourdomain.com")
            //       .AllowAnyMethod()
            //       .AllowAnyHeader()
            //       .AllowCredentials();
        });
    }
});

// Добавляем HttpClient для проксирования в development
builder.Services.AddHttpClient();

var app = builder.Build();

// В development режиме автоматически запускаем React dev server
if (app.Environment.IsDevelopment())
{
    var clientAppPath = Path.Combine(app.Environment.ContentRootPath, "ClientApp");
    var packageJsonPath = Path.Combine(clientAppPath, "package.json");
    
    if (File.Exists(packageJsonPath))
    {
        // Проверяем, не запущен ли уже React dev server (асинхронно)
        _ = Task.Run(async () =>
        {
            var isReactRunning = false;
            try
            {
                using var httpClient = new HttpClient();
                httpClient.Timeout = TimeSpan.FromSeconds(2);
                var response = await httpClient.GetAsync("http://localhost:3000");
                isReactRunning = response.IsSuccessStatusCode;
            }
            catch { }
            
            if (!isReactRunning)
            {
                // Запускаем React dev server
                try
                {
                    await Task.Delay(2000); // Задержка перед запуском
                    
                    Console.WriteLine("🚀 Запуск React dev server...");
                    Console.WriteLine($"   Папка: {clientAppPath}");
                    
                    var startInfo = new ProcessStartInfo();
                    
                    // В Windows используем cmd.exe для более надежного запуска
                    if (OperatingSystem.IsWindows())
                    {
                        startInfo.FileName = "cmd.exe";
                        startInfo.Arguments = $"/c npm start";
                    }
                    else
                    {
                        startInfo.FileName = "npm";
                        startInfo.Arguments = "start";
                    }
                    
                    startInfo.WorkingDirectory = clientAppPath;
                    startInfo.UseShellExecute = true;
                    startInfo.CreateNoWindow = false;
                    startInfo.WindowStyle = ProcessWindowStyle.Normal;
                    startInfo.RedirectStandardOutput = false;
                    startInfo.RedirectStandardError = false;
                    
                    var process = Process.Start(startInfo);
                    if (process != null)
                    {
                        Console.WriteLine("✅ React dev server запущен (PID: {0})", process.Id);
                        Console.WriteLine("   Ожидайте загрузки... (обычно 10-30 секунд)");
                        Console.WriteLine("   React будет доступен на: http://localhost:3000");
                    }
                    else
                    {
                        Console.WriteLine("⚠️  Не удалось запустить процесс npm");
                        Console.WriteLine("   Запустите вручную: cd Backend\\ClientApp && npm start");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"⚠️  Ошибка запуска React: {ex.Message}");
                    Console.WriteLine($"   Детали: {ex.GetType().Name}");
                    Console.WriteLine("   Запустите вручную: cd Backend\\ClientApp && npm start");
                }
            }
            else
            {
                Console.WriteLine("✅ React dev server уже запущен на http://localhost:3000");
            }
        });
    }
    else
    {
        Console.WriteLine("⚠️  React приложение не найдено в ClientApp/");
        Console.WriteLine($"   Ожидаемый путь: {packageJsonPath}");
        Console.WriteLine("   Скопируйте папки src/, public/ и файл package.json в Backend/ClientApp/");
    }
}

// Настраиваем pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    // В development не используем HTTPS редирект, чтобы не ломать запросы
}
else
{
    // В production используем HTTPS редирект
    app.UseHttpsRedirection();
}

// Разрешаем статические файлы из wwwroot (для JSON файлов)
app.UseStaticFiles();

app.UseRouting();

// Включаем CORS (должно быть после UseRouting, но до UseAuthorization)
app.UseCors();

app.UseAuthorization();

// Логирование всех входящих запросов для диагностики
app.Use(async (context, next) =>
{
    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    logger.LogInformation($"🌐 Входящий запрос: {context.Request.Method} {context.Request.Path}");
    await next();
});

// ВАЖНО: API маршруты должны быть зарегистрированы ПЕРЕД MapFallback
// Регистрируем контроллеры - они автоматически обработают маршруты
app.MapControllers();

// В production раздаем статические файлы React из wwwroot/build
if (!app.Environment.IsDevelopment())
{
    var buildPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot", "build");
    if (Directory.Exists(buildPath))
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(buildPath),
            RequestPath = ""
        });
        
        // SPA fallback - отдаем index.html для всех не-API запросов
        app.MapFallbackToFile("index.html", new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(buildPath)
        });
    }
}
else
{
    // В development режиме проксируем запросы к React dev server
    var httpClientFactory = app.Services.GetRequiredService<IHttpClientFactory>();
    
    // MapFallback должен быть ПОСЛЕ MapControllers, чтобы API запросы обрабатывались контроллерами
    app.MapFallback(async (HttpContext context) =>
    {
        // Пропускаем API запросы - они должны обрабатываться контроллерами
        // Если запрос дошел сюда, значит контроллер не обработал его (404)
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.StatusCode = 404;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync($"{{\"error\":\"API endpoint not found: {context.Request.Method} {context.Request.Path}\"}}");
            return;
        }
        
        try
        {
            var httpClient = httpClientFactory.CreateClient();
            var reactDevServerUrl = "http://localhost:3000";
            var requestPath = context.Request.Path.Value ?? "/";
            var queryString = context.Request.QueryString.Value ?? "";
            var url = $"{reactDevServerUrl}{requestPath}{queryString}";
            
            // Создаем HTTP запрос с теми же заголовками
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            foreach (var header in context.Request.Headers)
            {
                if (!header.Key.StartsWith(":") && 
                    header.Key != "Host" && 
                    header.Key != "Connection")
                {
                    try
                    {
                        request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                    catch { }
                }
            }
            
            var response = await httpClient.SendAsync(request);
            
            // Копируем статус код
            context.Response.StatusCode = (int)response.StatusCode;
            
            // Копируем заголовки ответа
            foreach (var header in response.Headers)
            {
                context.Response.Headers[header.Key] = header.Value.ToArray();
            }
            foreach (var header in response.Content.Headers)
            {
                context.Response.Headers[header.Key] = header.Value.ToArray();
            }
            
            // Устанавливаем Content-Type с правильной кодировкой
            var contentType = response.Content.Headers.ContentType?.ToString() ?? "text/html; charset=utf-8";
            if (!contentType.Contains("charset"))
            {
                contentType += "; charset=utf-8";
            }
            context.Response.ContentType = contentType;
            
            // Копируем тело ответа с правильной кодировкой
            var contentBytes = await response.Content.ReadAsByteArrayAsync();
            await context.Response.Body.WriteAsync(contentBytes, 0, contentBytes.Length);
        }
        catch
        {
            // Если React dev server не запущен, показываем сообщение
            context.Response.StatusCode = 503;
            context.Response.ContentType = "text/html";
            await context.Response.WriteAsync(@"
                <html>
                    <body>
                        <h1>React Development Server не запущен</h1>
                        <p>Запустите React приложение в отдельном терминале:</p>
                        <pre>cd ClientApp
npm start</pre>
                        <p>Или запустите Backend, который автоматически запустит React.</p>
                    </body>
                </html>
            ");
        }
    });
}

// Создаем необходимые папки
var wwwrootPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
if (!Directory.Exists(wwwrootPath))
{
    Directory.CreateDirectory(wwwrootPath);
}

app.Run();

