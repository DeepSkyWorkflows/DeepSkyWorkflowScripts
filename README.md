# PixInsight Scripts

This folder contains various script to assist with workflows.

## Scripts

These are the active scripts that are available.

See [release notes](./releases.md) for version details.

> **NOTE** The scripts are now available via the PixInsight update system. We are working on signing issues but for now you can navigate to Resources -> Manage Update Repositories and add the URL: [https://deepskyworkflows.com/pixinsight](https://deepskyworkflows.com/pixinsight/)

|Example (click for full size)|Script (click for documentation and source code)|Description|
|---|---|---|
|[![Thumbnail](./docs/images/autolinearfitexample_thumb.png)](./docs/images/autolinearfitexample.png)|[Auto-Linear Fit](./docs/autoLinearFit.md)|A script for normalizing RGB channels.|
|[![Thumbnail](./docs/images/fixrgbgoodexample_thumb.png)](./docs/images/fixrgbgoodexample.png)|[Fix RGB Pixels](./docs/fixRGBPixels.md)|Removes hot red, green, and blue pixels.|
|[![Thumbnail](./docs/images/createlummask_thumb.png)](./docs/images/createlummask.png)|[Create Lum Mask](./docs/createLumMask.md)|A quick way to generate a luminance mask from a non-linear image.|
|[![Thumbnail](./docs/images/nonlinearstretchexample_thumb.png)](./docs/images/nonlinearstretchexample.png)|[Non-Linear Stretch](./docs/nonLinearStretch.md)|Helps tweak contrast by increasing foreground and decreasing background with progressive masks.
|¯\\_(ツ)_/¯|[Generate Decon Support](./docs/generateDeconSupport.md)|Creates the masks I use for deconvolution.|
|[![Thumbnail](./docs/images/pillars_thumb.png)](./docs/images/pillars.png)|[Hubble Palette to RGB](./docs/applyHubbleToRGB.md)|Applies the "Hubble palette" to images.|
|[![Thumbnail](./docs/images/denoiseexample_thumb.png)](./docs/images/denoiseexample_thumb.png)|[Deep Denoise](./docs/deepDenoise.md)|Removes noise from linear (non-stretched) images.|
|[![Thumbnail](./docs/images/simplestretch_thumb.png)](./docs/images/simplestretch_thumb.png)|[Simple Stretch](./docs/simpleStretch.md)|Applies a Screen Transfer Function followed by a Histogram Transformation.|
||Star Trail Magic|(documentation coming soon) Make star trails or arcs and even animate them for timelapses.

## Installation

The easiest way is to go to Resources, then Manage Update Repositories, and add the following URL:

`https://deepskyworkflows.com/pixinsight`

When you restart, the scripts will be installed.

Here are the old instructions for manually installing:

The first step is to download the scripts. You can either clone this repository, or [download the latest release](https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts/releases).

Once you have the scripts in a folder, for example, `DeepSkyWorkflows`, you can install with the following steps:

1. Open PixInsight
2. Under the `Scripts` tab, choose `Feature Scripts`
   ![Feature scripts](./docs/images/step1.png)
3. With the dialog that opens, click the `Add` button in the lower left
4. Navigate to and select the folder with the scripts
5. Verify that `DeepSkyWorkflows` has been added
   ![Verify](./docs/images/confirmscriptadd.png)
6. You're ready to go! It should appear under `Scripts > DeepSkyWorkflows`.

[Back to Main](../README.md)
