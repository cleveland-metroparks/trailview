NOTE: Some paths might have to be changed according to where you're building from

1. Install MSYS2 https://www.msys2.org/

2. Open `MSYS2 MSYS` from Start Menu

3. Run the following commands
   
   * `pacman -Syyu`
   
   * `pacman -Syyu` (yes, 2 times)
   
   * `pacman -S base-devel mingw-w64-x86_64-toolchain` (Press Enter for default=all)
   
   * `pacman -S mingw-w64-meson`
   
   * `pacman -S mingw-w64-x86_64-opencv`

4. Open `MSYS2 MinGW x64` from Start Menu

5. Navigate to `/c/www/trailview/tools/blur360` or wherever blur360 is located

6. Run the commands
   
   * `meson build`
   
   * `meson configure build/ --buildtype release`
   
   * `ninja -C build/`

7. Navigate to `/c/www/trailview/tools/mingw-bundledlls`

8. Run the command
   
   * `mingw-bundledlls --copy /c/www/trailview/tools/blur360/build/src/equirect-blur-image.exe`

9. You should now be able to successfully run `equirect-blur-image.exe --help` and see a correct help output without any errors
