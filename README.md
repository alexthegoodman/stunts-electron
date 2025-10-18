# Stunts Cross-Platform

![Stunts 10/07/25](resources/screenshot1.png 'Stunts 10/07/25')

**The motion graphics editor of the future!** A bold claim based on high-quality zooms, generative keyframes, perspective, and 3D mockups, as well as a powerful, custom-built 3D engine built on-top of both WebGPU and WebGL.

**Stunts is a motion graphics editor built for high-impact, short-form video content.** Create cinematic product demos, social media ads, app previews, and brand animations with professional visual flair—fast.

## What Makes Stunts Different

- **Cinematic camera movements** - Mouse movements translate into smooth, eased keyframes with perspective effects for that signature scan-like feel
- **Specialist tool for short-form** - Optimized for 30-90 second videos where every frame needs to punch (not long-form content)
- **Custom 3D engine** - Built on WebGPU and WebGL for powerful 3D mockups and animations
- **Generative keyframes** - Intelligent animation assistance that adds craft automatically
- **Fast workflow** - Most effects are just a couple clicks with intuitive options

## Best For

- Product launches and teasers
- Social media advertisements
- App store preview videos
- Website hero animations
- Logo reveals and brand content
- Short explainer clips
- Any video that needs to stop the scroll

## Free & Open Source

Stunts is completely free and open source. Contributors are more than welcome!

## Project Setup

### Install

#### You may wish to install ffmpeg on your system. It is optional, but sometimes a video may perform better if pre-processed by FFmpeg.

🍎 macOS (Homebrew) Instructions

Homebrew is a free and open-source package management system that simplifies the installation of software on Apple's macOS.

Step 1: Install Homebrew (If needed) You should open the Terminal application (found in Applications > Utilities) and paste the following command, then press Enter. (You may be prompted to enter their password)

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Step 2: Install FFmpeg:
Once Homebrew is installed, just need to run this command in the Terminal:

```
brew install ffmpeg
```

What this does: Homebrew will download the latest stable version of FFmpeg and all its required dependencies, compiling and installing it on your system.

Step 3: Verify the Installation
To check that FFmpeg is installed and working correctly, you can run:

```
ffmpeg -version
```

This should output the version number and build configuration, confirming the installation.

💻 Windows (Scoop) Instructions
Scoop is a command-line installer for Windows that keeps programs separate from the Program Files, making installations cleaner and simpler.

Step 1: Install Scoop (If needed)
First open PowerShell. You can do this by searching for "PowerShell" in the Windows Start Menu.

A. Allow Remote Scripts (Initial Setup)
Before installing Scoop, you need to ensure your system allows running the installation script. You only need to run this once:

```
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

You will be prompted; you should type A (for Yes to All) and press Enter.

B. Install Scoop
Now, you run the Scoop installation command:

```
irm get.scoop.sh | iex
```

Step 2: Install FFmpeg
After Scoop is installed, you can install FFmpeg with one command in PowerShell:

```
scoop install ffmpeg
```

What this does: Scoop downloads and installs the official FFmpeg static builds.

Step 3: Verify the Installation
To check that FFmpeg is installed and working correctly, you can run:

```
ffmpeg -version
```

This should output the version number and build configuration, confirming the installation.

#### Install NPM dependencies

```bash
$ npm install
```

### Development / Local Use

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
