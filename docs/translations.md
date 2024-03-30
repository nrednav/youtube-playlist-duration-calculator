# Translations

This document describes the process involved in submitting additional
translations for the extension.

## Pre-requisites

- An understanding of JSON

## Process

### Adding new translations

- Download the project repository as a ZIP file
- Extract it to a folder
- Within the extracted folder, navigate into the `public/_locales` folder
- Make a copy of the `en` folder
- Rename the copy to `<locale-code>`
  - `<locale-code>` should be replaced with the locale code for the translations
    you are adding
  - For a full list of supported locale codes, please see: https://developer.chrome.com/docs/extensions/reference/api/i18n#locales
- Edit the `messages.json` file within `<localeCode>` to add your translations
  - You only have to update the values of the `message` properties throughout
    the file
- Once you have finished adding translations
  - Create a new issue by visiting this [link](https://github.com/nrednav/youtube-playlist-duration-calculator/issues/new)
  - Attach the `messages.json` file containing your translations to the issue

### Updating existing translations

- Same as above except instead of copying the `en` folder, you can directly edit
  the `messages.json` file in the existing locale folder
