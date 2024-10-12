@echo off
setlocal enabledelayedexpansion

:: Create new directory structure
mkdir src\crawler\core
mkdir src\crawler\performance
mkdir src\crawler\analysis
mkdir src\crawler\internationalization
mkdir src\crawler\custom-extraction
mkdir src\crawler\pagination
mkdir src\crawler\mobile
mkdir src\crawler\schemas
mkdir src\crawler\interfaces
mkdir src\crawler\dto
mkdir src\crawler\config

:: Move existing files to appropriate directories
move src\crawler\crawler.service.ts src\crawler\core\
move src\crawler\crawler.controller.ts src\crawler\core\
move src\crawler\crawler.module.ts src\crawler\core\
move src\crawler\crawler.gateway.ts src\crawler\core\

move src\crawler\content-extractor.ts src\crawler\core\
move src\crawler\url-extractor.ts src\crawler\core\
move src\crawler\robots-txt.service.ts src\crawler\core\
move src\crawler\sitemap-crawler.service.ts src\crawler\core\
move src\crawler\sitemap-parser.ts src\crawler\core\

move src\crawler\seo-analyzer.ts src\crawler\analysis\

move src\crawler\crawler-config.service.ts src\crawler\config\
move src\crawler\inclusion-exclusion.service.ts src\crawler\config\

move src\crawler\crawling-data.repository.ts src\crawler\core\

move src\crawler\schemas\crawling-data.schema.ts src\crawler\schemas\
move src\crawler\schemas\crawling-session.schema.ts src\crawler\schemas\

move src\crawler\dto\specific-url-list.dto.ts src\crawler\dto\

:: Update import statements in moved files
for %%F in (
    src\crawler\core\crawler.service.ts
    src\crawler\core\crawler.controller.ts
    src\crawler\core\crawler.module.ts
    src\crawler\core\crawler.gateway.ts
    src\crawler\core\content-extractor.ts
    src\crawler\core\url-extractor.ts
    src\crawler\core\robots-txt.service.ts
    src\crawler\core\sitemap-crawler.service.ts
    src\crawler\core\sitemap-parser.ts
    src\crawler\analysis\seo-analyzer.ts
    src\crawler\config\crawler-config.service.ts
    src\crawler\config\inclusion-exclusion.service.ts
    src\crawler\core\crawling-data.repository.ts
) do (
    powershell -Command "(gc %%F) -replace 'from ''\.\./', 'from ''../../' | Out-File -encoding ASCII %%F"
    powershell -Command "(gc %%F) -replace 'from ''\./', 'from ''../' | Out-File -encoding ASCII %%F"
)

:: Update main app.module.ts to reflect new structure
powershell -Command "(gc src\app.module.ts) -replace 'from ''./crawler/crawler.module'';', 'from ''./crawler/core/crawler.module'';' | Out-File -encoding ASCII src\app.module.ts"

echo Refactoring complete. Please review the changes and adjust any remaining import statements manually if needed.
