/*

generateDeconSupport.js: Generate support for deconvolution.
================================================================================
This script implements my workflow for deconvolution. It will create:

   1. An extracted luminance view for PSF generation
   2. A stretched luminance mask to support generation of other masks
   3. An advanced star mask using StarNet++
   4. A saturation mask to hide oversaturated stars from PSF generation
   5. A deconvolution support mask in case global de-ringing falls short

================================================================================
 *
 *
 * Copyright Jeremy Likness, 2021
 *
 * License: https://github.com/JeremyLikness/DeepSkyWorkflows/LICENSE
 *
 * Source: https://github.com/JeremyLikness/DeepSkyWorkflows/tree/master/piscripts
 *
 *
 * mailTo:deepskyworkflows@gmail.com
 */

#feature-id    DeepSkyWorkflows > GenerateDeconSupport

#define TITLE "Generate Decon Support"

#include "deepSkyCommon.js"

function doExtractLuminance(executionState) {
   showStep(executionState, "Extracting luminance....");
   if (executionState.config.prefs.extractLum === false && executionState.masks.lum) {
      writeLines(concatenateStr("Using existing luminance channel: ",
         executionState.masks.lum.id));
      return;
   }
   writeLines('Extracting luminance...');
   extractLuminance(executionState, '_Lum');
   var lum = ImageWindow.windowById(executionState.channels[0][1]).mainView;
   console.writeln(concatenateStr('Luminance extracted as ', lum.id));
   executionState.masks.lum = lum;
}

function generateLumMask(executionState) {

   showStep(executionState, "Creating luminance mask....");

   if (executionState.masks.lumMask) {
      writeLines(concatenateStr("Using existing luminance mask: ",
         executionState.masks.lumMask.id));
      return;
   }

   writeLines('Generating luminance mask...');
   var dupId = pixMathClone(executionState.masks.lum, '_Mask');
   var lumMask = ImageWindow.windowById(dupId).mainView;
   applySTF(lumMask);
   applyHistogramTransformation(lumMask);
   executionState.masks.lumMask = lumMask;
}

function blurStars(executionState) {
   if (executionState.config.prefs.blurStars === true) {
      writeLines('Applying convolution...');
      var c = new Convolution;
      c.mode = Convolution.prototype.Parametric;
      c.sigma = 2.40;
      c.shape = 1.45;
      c.aspectRatio = 1.00;
      c.rotationAngle = 0.00;
      c.filterSource = "";
      c.rescaleHighPass = false;
      c.viewId = "";
      c.executeOn(executionState.masks.starMask);
   }
}

function growStars(executionState) {
   if (executionState.config.prefs.growIterations > 0) {
      writeLines('Applying morphological transformation...');
      var mt = new MorphologicalTransformation;
      mt.operator = MorphologicalTransformation.prototype.Dilation;
      mt.interlacingDistance = 1;
      mt.lowThreshold = 0.000000;
      mt.highThreshold = 0.000000;
      mt.numberOfIterations = executionState.config.prefs.growIterations;
      mt.amount = 1.00;
      mt.selectionPoint = 0.50;
      mt.structureName = "";
      mt.structureSize = 3;
      mt.structureWayTable = [ // mask
         [[
         0x01,0x01,0x01,
         0x01,0x01,0x01,
         0x01,0x01,0x01
         ]]
      ];
      mt.executeOn(executionState.masks.starMask);
   }
}

function generateStarMask(executionState) {

   showStep(executionState, "Generating the star mask...");

   var noStarsId = pixMathClone(executionState.masks.lumMask, '_NoStars');
   var noStarsMask = ImageWindow.windowById(noStarsId).mainView;

   writeLines('Generating star mask...');

   var sn = new StarNet;
   sn.stride = StarNet.prototype.Stride_128;
   sn.mask = true;

   sn.executeOn(noStarsMask);

   var starmask = ImageWindow.activeWindow.mainView;
   executionState.masks.noStarsMask = noStarsMask;
   executionState.masks.starMask = starmask;

   growStars(executionState);
   blurStars(executionState);
}

function generateSaturationMask(executionState) {

   if (executionState.config.prefs.generateSaturationMask === true) {
      showStep(executionState, "Generating saturation mask...");
      // binarized
      var saturationId = pixMathClone(executionState.masks.lumMask, '_Saturated');
      var saturationMask = ImageWindow.windowById(saturationId).mainView;
      writeLines('Generating binarized mask for saturated stars...');
      var b = new Binarize;
      b.thresholdRK = 0.80000000;
      b.thresholdG = 0.80000000;
      b.thresholdB = 0.80000000;
      b.isGlobal = true;
      b.executeOn(saturationMask);
      executionState.masks.saturationMask = saturationMask;
   }
}

function generateDeconSupport(executionState) {
   if (executionState.config.prefs.generateDeconSupport === true) {
      showStep(executionState, "Generating decon support mask....");
      writeLines('Generating deconvolution support mask...');
      var sm = new StarMask;
      sm.shadowsClipping = 0.00000;
      sm.midtonesBalance = 0.50000;
      sm.highlightsClipping = 1.00000;
      sm.waveletLayers = 6;
      sm.structureContours = false;
      sm.noiseThreshold = 0.50000;
      sm.aggregateStructures = false;
      sm.binarizeStructures = false;
      sm.largeScaleGrowth = 2;
      sm.smallScaleGrowth = 1;
      sm.growthCompensation = 2;
      sm.smoothness = 16;
      sm.invert = false;
      sm.truncation = 1.00000;
      sm.limit = 1.00000;
      sm.mode = StarMask.prototype.StarMask;
      sm.executeOn(executionState.view);
      var deconSupportMask = ImageWindow.activeWindow.mainView;
      deconSupportMask.id = getNewName(executionState.view.id, '_Decon');
      executionState.masks.deconSupportMask = deconSupportMask;
   }
}

function makeDeconProcess(executionState) {
   if (executionState.config.prefs.launchDeconProcess !== true) {
      return;
   }
   showStep(executionState, "Configuring Deconvolution process instance....");
   writeLines("Launching decon process with defaults...");
   let supportId = executionState.masks.deconSupportMask ?
      executionState.masks.deconSupportMask.id : "";
   var P = new Deconvolution;
   P.algorithm = Deconvolution.prototype.RichardsonLucy;
   P.numberOfIterations = 25;
   P.deringing = true;
   P.deringingDark = 0.0020;
   P.deringingBright = 0.0000;
   P.deringingSupport = true;
   P.deringingSupportAmount = 0.20;
   P.deringingSupportViewId = supportId;
   P.toLuminance = true;
   P.psfMode = Deconvolution.prototype.External;
   P.psfSigma = 2.00;
   P.psfShape = 2.00;
   P.psfAspectRatio = 1.00;
   P.psfRotationAngle = 0.00;
   P.psfMotionLength = 5.00;
   P.psfMotionRotationAngle = 0.00;
   P.psfViewId = "";
   P.psfFFTSizeLimit = 15;
   P.useRegularization = false;
   P.waveletLayers = [ // noiseThreshold, noiseReduction
      [3.00, 1.00],
      [2.00, 0.70],
      [1.00, 0.70],
      [1.00, 0.70],
      [1.00, 0.70]
   ];
   P.noiseModel = Deconvolution.prototype.Gaussian;
   P.numberOfWaveletLayers = 2;
   P.scalingFunction = Deconvolution.prototype.B3Spline5x5;
   P.convergence = 0.0000;
   P.rangeLow = 0.0000000;
   P.rangeHigh = 0.0000000;
   P.iterations = [ // count
      [0],
      [0],
      [0]
   ];

   P.launch();
}

function launchDynamicPSFProcess(executionState) {
   if (executionState.config.prefs.launchDynamicPSF === true && executionState.masks.saturationMask) {
      showStep(executionState, "Launching dynamic PSF...");
      let lum = executionState.masks.lum;
      lum.window.mask = executionState.masks.saturationMask.window;
      lum.window.maskEnabled = true;
      lum.window.maskInverted = true;
      lum.window.maskVisible = true;
      var P = new DynamicPSF;
      P.views = [ // id
      ];
      P.stars = [ // viewIndex, channel, status, x0, y0, x1, y1, x, y
      ];
      P.psf = [ // starIndex, function, circular, status, B, A, cx, cy, sx, sy, theta, beta, mad, celestial, alpha, delta, flux, meanSignal
      ];
      P.autoPSF = true;
      P.circularPSF = false;
      P.gaussianPSF = true;
      P.moffatPSF = false;
      P.moffat10PSF = false;
      P.moffat8PSF = false;
      P.moffat6PSF = false;
      P.moffat4PSF = false;
      P.moffat25PSF = false;
      P.moffat15PSF = false;
      P.lorentzianPSF = false;
      P.variableShapePSF = false;
      P.autoVariableShapePSF = false;
      P.betaMin = 1.00;
      P.betaMax = 4.00;
      P.signedAngles = true;
      P.regenerate = true;
      P.astrometry = true;
      P.searchRadius = 8;
      P.threshold = 1.00;
      P.autoAperture = true;
      P.scaleMode = DynamicPSF.prototype.Scale_Pixels;
      P.scaleValue = 1.00;
      P.scaleKeyword = "";
      P.starColor = 4292927712;
      P.selectedStarColor = 4278255360;
      P.selectedStarFillColor = 0;
      P.badStarColor = 4294901760;
      P.badStarFillColor = 2164195328;
      P.launchInterface();
      lum.window.bringToFront();
      applySTF(lum);
      lum.window.zoomToFit();
   }
}

function showStep(executionState, message) {
   executionState.step++;
   executionState.updateProgress(
      concatenateStr('Step ', executionState.step,
         ' of ', executionState.steps,
          ': ', message));
}

function doDecon(executionState) {

   executionState.updateProgress = executionState.updateProgress ||
      function () {};

   executionState.step = 0;
   executionState.steps = 7;
   if (executionState.config.prefs.generateSaturationMask === false) {
      executionState.steps -= 2;
   }
   else {
      if (executionState.config.prefs.launchDynamicPSF === false) {
         executionState.steps--;
      }
   }

   if (executionState.config.prefs.generateDeconSupport === false) {
      executionState.steps--;
   }

   if (executionState.config.prefs.launchDeconProcess === false) {
      executionState.steps--;
   }

   doExtractLuminance(executionState);
   generateLumMask(executionState);
   generateStarMask(executionState);
   generateSaturationMask(executionState);
   generateDeconSupport(executionState);
   makeDeconProcess(executionState);
   launchDynamicPSFProcess(executionState);

   for (var mask in executionState.masks) {
      writeLines(concatenateStr('Generated mask ', mask, ': ',
         executionState.masks[mask].id));
   }

   writeLines('Done.');
}

function validate(dlg, executionState) {
   let prefs = executionState.config.prefs;
   if (prefs.extractLum === true) {
      delete executionState.masks.lum;
   }
   else if (!(executionState.masks.lum && executionState.masks.lum.id)) {
      showDialog("Validation failed", "Luminance channel is required");
      return false;
   }
   if (prefs.generateLumMask === true) {
      delete executionState.masks.lumMask;
   }
   else if (!(executionState.masks.lumMask && executionState.masks.lumMask.id)) {
      showDialog("Validation failed", "Luminance mask is required");
      return false;
   }
   return true;
}

function gdsDialog(executionState)
{
   // Add all properties and methods of the core Dialog object to this object.
   this.__base__ = Dialog;
   this.__base__();

   var dlg = this;
   prepareDialog(dlg);

   this.execState = executionState;
   this.progressArea = createProgressLabel(dlg);

   // ------------------------------------------------------------------------
   // GUI
   // ------------------------------------------------------------------------

   this.lblHeadLine = new Label(this);
   with (this.lblHeadLine)
   {
      useRichText = true;
      text = concatenateStr('<b>', TITLE, ' v', VERSION, '</b>');
   }

   // my copyright
   this.lblCopyright = new Label(this);
   this.lblCopyright.text = "© 2021, Jeremy Likness";

   this.extractLumCheckbox = createBoundCheckbox(dlg, "extractLum",
      dlg.execState.config);

   this.extractLumCheckbox.onCheck = chainFn(dlg.extractLumCheckbox,
      "onCheck",
      function (val) {
         dlg.lumViewSelector.enabled = !val;
         if (val) {
            dlg.generateLumMaskCheckbox.checked = true;
            dlg.genMaskViewSelector.enabled = false;
         }
         else {
            dlg.genMaskViewSelector.enabled = !dlg.generateLumMaskCheckbox.checked;
         }
      });

   // my copyright
   this.lblLumViewSelector = new Label(this);
   this.lblLumViewSelector.text = "Select existing luminance channel:";

   this.lumViewSelector = new ViewList(this);
	with (this.lumViewSelector) {
      enabled = !dlg.execState.config.prefs.extractLum;
      toolTip = "Select the existing luminance channel";
		onViewSelected = function (value) {
         if (value.image.numberOfChannels === 1) {
            dlg.execState.masks.lum = value;
         }
      }
		getAll();
	}

   this.generateLumMaskCheckbox = createBoundCheckbox(dlg, "generateLumMask",
      dlg.execState.config);

   // my copyright
   this.lblLumMaskViewSelector = new Label(this);
   this.lblLumMaskViewSelector.text = "Select existing luminance mask:";

   this.generateLumMaskCheckbox.onCheck = chainFn(dlg.generateLumMaskCheckbox,
      "onCheck",
      function (val) {
         dlg.genMaskViewSelector.enabled = !val;
      });

   this.genMaskViewSelector = new ViewList(this);
	with (this.genMaskViewSelector) {
      enabled = !dlg.execState.config.prefs.generateLumMask;
      toolTip = "Select the existing luminance mask";
		onViewSelected = function (value) {
         if (value.image.numberOfChannels === 1) {
            dlg.execState.masks.lumMask = value;
         }
      }
		getAll();
	}

   this.luminanceSettings = createVerticalGroupBox(this,
      "Luminance masks", dlg.extractLumCheckbox,
      dlg.lblLumViewSelector,
      dlg.lumViewSelector,
      dlg.generateLumMaskCheckbox,
      dlg.lblLumMaskViewSelector,
      dlg.genMaskViewSelector);

   this.growSlider = createBoundNumericControl(this, 'growIterations', executionState.config,
      {low:0, high: 5 });

   this.blurCheckbox = createBoundCheckbox(this, "blurStars",
      dlg.execState.config);

   this.starMaskSettings = createVerticalGroupBox(this, "StarMask settings", dlg.growSlider,
      null, dlg.blurCheckbox);

   // launchDynamicPSF
   this.saturationCheckbox = createBoundCheckbox(this, "generateSaturationMask",
      dlg.execState.config);

   this.saturationLimitSlider = createBoundNumericControl(this, 'saturationLimit',
      executionState.config, {low:0, high:100});

   this.launchDynamicPSFCheckbox = createBoundCheckbox(this, "launchDynamicPSF",
      dlg.execState.config);

   this.saturationCheckbox.onCheck = chainFn(dlg.saturationCheckbox,
      "onCheck",
      function (val) {
         dlg.saturationLimitSlider.enabled = val;
         dlg.launchDynamicPSFCheckbox.enabled = val;
         if (val === false) {
            dlg.launchDynamicPSFCheckbox.checked = false;
         }
      });

   this.PSFSettings = createVerticalGroupBox(this, "PSF settings", dlg.saturationCheckbox,
      dlg.saturationLimitSlider, dlg.launchDynamicPSFCheckbox);

   this.deconSupportCheckbox = createBoundCheckbox(this, "generateDeconSupport",
      dlg.execState.config);

   this.launchDeconProcess = createBoundCheckbox(this, "launchDeconProcess",
      dlg.execState.config);

   this.deconSettings = createVerticalGroupBox(this, "Decon settings",
      dlg.deconSupportCheckbox, dlg.launchDeconProcess);

   // main settings
   this.buttonSizer = createToolbar(dlg, dlg.execState.config, {
         newInstanceIcon: true,
         applyIcon: true,
         applyFn: function () {
            if (validate(dlg, executionState)) {
               dlg.execState.config.closeOnExit = true;
               dlg.execState.updateProgress = dlg.updateProgress;
               doDecon(dlg.execState);
               dlg.execState.config.saveSettings();
            }
            else {
               dlg.execState.config.closeOnExit = false;
            }
         },
         resetIcon: true
      });

   this.sizer = new VerticalSizer(this);
   this.sizer.margin = 6;
   this.sizer.spacing = 6;
   this.sizer.add(this.lblHeadLine);
   this.sizer.add(this.lblCopyright);
   this.sizer.add(this.luminanceSettings);
   this.sizer.add(this.starMaskSettings);
   this.sizer.add(this.PSFSettings);
   this.sizer.add(this.deconSettings);
   this.sizer.add(this.progressArea);
   this.sizer.add(this.buttonSizer);
   this.windowTitle = concatenateStr(TITLE, ' v', VERSION);

   this.adjustToContents();
}

gdsDialog.prototype = new Dialog;

// main method
function main() {

   let executionState = {
      masks: {
      },
      config: createSettingsManager([
         {
            setting: "generateDeconSupport",
            dataType: DataType_Boolean,
            defaultValue: true,
            label: "Generate deconvolution support mask",
            tooltip: "Choose whether or not to generate the support mask."
         },
         {
            setting: "generateSaturationMask",
            dataType: DataType_Boolean,
            defaultValue: true,
            label: "Generate saturation mask",
            tooltip: "Choose whether or not to generate the mask for PSF support. Disable if you use a script."
         },
         {
            setting: "launchDeconProcess",
            dataType: DataType_Boolean,
            defaultValue: true,
            label: "Launch deconvolution proceess",
            tooltip: "Choose whether or not to launch deconvolution with defaults."
         },
         {
            setting: "launchDynamicPSF",
            dataType: DataType_Boolean,
            defaultValue: true,
            label: "Launch dynamic PSF proceess",
            tooltip: "Choose whether or not to launch dynamic PSF."
         },
         {  setting: "saturationLimit",
            dataType: DataType_Double,
            defaultValue: 0.8,
            label: "Saturation limit:",
            precision: 3,
            tooltip: "Choose the saturation limit for generating the PSF model.",
            range: { low: 0.4, high: 0.999 }
         },
         {
            setting: "growIterations",
            dataType: DataType_Int16,
            defaultValue: 3,
            precision: 0,
            label: "Iterations to grow star mask:",
            tooltip: "Choose how many times to dilate the star mask. 0 for none.",
            range: { low: 0, high: 5 }
         },
         {
            setting: "blurStars",
            dataType: DataType_Boolean,
            defaultValue: true,
            label: "Blur star mask",
            tooltip: "Choose whether or not to apply convolution to the star mask."
         },
         {
            setting: "extractLum",
            dataType: DataType_Boolean,
            defaultValue: true,
            label: "Extract luminance",
            tooltip: "Extract luminance or select existing view."
         },
         {
            setting: "generateLumMask",
            dataType: DataType_Boolean,
            defaultValue: true,
            label: "Generate luminance mask",
            tooltip: "Generate the luminance mask or select existing view."
         }

      ])
   };

   executionState.config.init();

   writeLines(concatenateStr('v', VERSION, ' invoked'));

   if ( Parameters.isGlobalTarget || Parameters.isViewTarget ) {
      executionState.config.loadParameters();
   }

   if (Parameters.isViewTarget) {
      executionState.view = Parameters.targetView;
      doDecon(executionState);
   }
   else {
      executionState.view = ImageWindow.activeWindow.currentView;
      let dialog = new gdsDialog(executionState);
      dialog.execute();
   }
}

main();
