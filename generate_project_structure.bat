@echo off
setlocal EnableDelayedExpansion

:: Define the output file
set output_file=project_structure.txt

:: Clear the output file if it exists
echo Clearing output file: %output_file%
if exist %output_file% (
    del %output_file%
    echo %output_file% deleted.
) else (
    echo %output_file% does not exist, no need to delete.
)

:: Start processing the directory structure
echo Starting to process the directory structure...
call :recurse_dir "src" ""
goto :eof

:recurse_dir
set "dir_path=%~1"
set "indent=%~2"

echo.
echo Processing directory: !dir_path!
echo Current indent: [!indent!]

:: Check if the directory exists
if not exist "!dir_path!" (
    echo ERROR: Directory not found: !dir_path!
    goto :eof
)

:: Iterate over all files in the current directory
echo Listing files in !dir_path!...
for /f "delims=" %%F in ('dir /b /a-d "!dir_path!"') do (
    set "file_path=!dir_path!\%%F"
    echo Processing file: %%F
    echo Full file path: !file_path!
    
    echo !indent!!file_path! >> !output_file!

    
    :: Check if the file exists before trying to read it
    if exist "!file_path!" (
        echo Reading file content: !file_path!
        type "!file_path!" >> !output_file!
    ) else (
        echo ERROR: File not found: !file_path!
        echo ERROR: File not found: !file_path! >> !output_file!
    )

    echo. >> !output_file!
)

:: Recursively iterate over subdirectories
echo Listing subdirectories in !dir_path!...
for /d %%D in ("!dir_path!\*") do (
    echo Found subdirectory: %%~nxD
    call :recurse_dir "%%~fD" "!indent!    "
)

goto :eof