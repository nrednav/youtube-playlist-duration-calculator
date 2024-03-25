# Youtube Playlist Duration Calculator

A Firefox & Chrome web extension that calculates & displays the total duration of a youtube playlist.

<img src="screenshots/banner.png">

## Previews

<p align="center">
  <img src="screenshots/default.png" width="800">
</p>

<p align="center">
  <img src="screenshots/example1.png" width="400">
  <img src="screenshots/example1_2.png" width="400">
</p>

## Installation

- Chrome: [Web Store](https://chrome.google.com/webstore/detail/youtube-playlist-duration/pijbakhgmhhadeakaocjfockpndcpobk)
- Firefox: [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/youtube-playlist-duration-calc/)

Alternatively, you can install the extension manually using the following instructions:-

For Chrome:

1. Download this project as a zip file.
2. Navigate to `chrome://extensions` in Google Chrome or a chromium-based fork such as Brave Browser.
3. Check the box for **Developer Mode**
4. Look for a button that says **Load unpacked extension** and click it
5. Select the project zip file you downloaded in Step 1.
6. You should now see the extension installed amongst your other extensions.
7. To verify that it works, navigate to a youtube playlist overview page, for example: https://www.youtube.com/playlist?list=PLAhTBeRe8IhMmRve_rSfAgL_dtEXkKh8Z
8. You should see the playlist's total duration appear under the playlist title.

For Firefox:

1. Download this project as a zip file.
2. Extract out the ytpdc-firefox folder
3. Install Mozilla's web-ext tool: [Link to workshop](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)
4. Navigate to the ytpdc-firefox directory in a command-line tool of your choice, and run `web-ext run` to test the add-on in a temporary browser
5. Follow the instructions available in Mozilla's web-ext workshop at the link provided above to sign the extension yourself with `web-ext sign`
6. Once you have signed it, you should find a .xpi file located within a folder named 'web-ext-artifacts' inside the ytpdc-firefox folder
7. Navigate to `about:addons` via the address bar in Firefox, click the cog-wheel on the top right, choose `Install Add-on from file` and select the `.xpi` file from the previous step

## Development

- Clone this repository
- Install dependencies

  ```
  pnpm install
  ```

- Build the extension

  ```
  pnpm run build:chrome
  pnpm run build:firefox
  ```

  This will output the extension into the `dist` folder

- Run the extension in development mode

  ```
  pnpm run dev
  ```
