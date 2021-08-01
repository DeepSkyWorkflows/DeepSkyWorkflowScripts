/*

fixRGBpixels.js: Clean up noisy red, green, and blue pixels.
================================================================================

Sometimes DSLR generates random noise in the form of red, green, and blue pixels. This script cleans
them up by finding pixels that deviate from the other two channels and normalizing them.
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

#feature-id    DeepSkyWorkflows > FixRGBPixels

#define TITLE "Fix RGB Pixels"

#include "deepSkyCommon.js"

// main method
function doFix(executionState) {

   let sourceViewId = executionState.view.id;

   writeLines(concatenateStr('processing view ', sourceViewId));

   let strength = (executionState.config.prefs.strength-1.0)/9.0;
   strength = 1.0 - strength;
   let ratio = 2.0 + (strength * 8.0);
   console.writeln(concatenateStr('Using ratio of ', ratio));

   var P = new PixelMath;
   P.expression = "iif(($T[0]/$T[1])>=ratio&&($T[0]/$T[2])>=ratio,mean($T[1],$T[2]),$T[0]);";
   P.expression1 = "iif(($T[1]/$T[0])>=ratio&&($T[1]/$T[2])>=ratio,mean($T[0],$T[2]),$T[1]);";
   P.expression2 = "iif(($T[2]/$T[0])>=ratio&&($T[2]/$T[1])>=ratio,mean($T[0],$T[1]),$T[2]);";
   P.expression3 = "";
   P.useSingleExpression = false;
   P.symbols = "ratio = " + ratio + ";";
   P.clearImageCacheAndExit = false;
   P.cacheGeneratedImages = false;
   P.generateOutput = true;
   P.singleThreaded = false;
   P.optimization = true;
   P.use64BitWorkingImage = false;
   P.rescale = false;
   P.rescaleLower = 0;
   P.rescaleUpper = 1;
   P.truncate = true;
   P.truncateLower = 0;
   P.truncateUpper = 1;
   P.createNewImage = executionState.config.prefs.createNewInstance;
   P.showNewImage = true;
   P.newImageId = executionState.config.prefs.createNewInstance ? getNewName(executionState.view.id, '_fixed') : "";
   P.newImageWidth = 0;
   P.newImageHeight = 0;
   P.newImageAlpha = false;
   P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
   P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
   P.executeOn(executionState.view);

   writeLines('Done');
}

function frgbDialog(executionState)
{
   // Add all properties and methods of the core Dialog object to this object.
   this.__base__ = Dialog;
   this.__base__();

   var dlg = this;
   prepareDialog(dlg);
   this.execState = executionState;

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

   this.createNewInstance = align(createBoundCheckbox(dlg, 'createNewInstance',
      dlg.execState.config), align.ALIGN_RIGHT);

   // main settings
   this.strengthSlider = createBoundNumericControl(dlg, 'strength',
      dlg.execState.config, { low: 1, high: 10 });

   this.strengthSlider.minWidth = 400;

   this.settings = createVerticalGroupBox(this, "Settings",
      dlg.strengthSlider, dlg.createNewInstance);

   this.buttonSizer = createToolbar(this, dlg.execState.config, {
      newInstanceIcon: true,
      applyIcon: true,
      applyFn: function () {
         doFix(dlg.execState);
         dlg.execState.config.saveSettings();
      },
      resetIcon: true
   });

   this.sizer = new VerticalSizer(this);
   with (this.sizer) {
      margin = 6;
      spacing = 4;
      add(dlg.lblHeadLine);
      add(dlg.lblCopyright);
      add(dlg.settings);
      add(dlg.buttonSizer);
   }
}

frgbDialog.prototype = new Dialog;

function main() {

   let executionState = {
      config: createSettingsManager([
         {
            setting: "strength",
            dataType: DataType_Int16,
            defaultValue: 10,
            label: "Strength:",
            precision: 0,
            tooltip: "Scale from 1 to 10 for how aggressive. 1 translates to a 10:1 ratio, 10 is a 2:1 ratio",
            range: { low: 1, high: 10 }
         },
         {
            setting: "createNewInstance",
            dataType: DataType_Boolean,
            defaultValue: false,
            label: "Create new instance",
            tooltip: "Create a new instance or apply to existing image",
            persist: false
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
      doFix(executionState);
   }
   else {
      executionState.view = ImageWindow.activeWindow.currentView;
      executionState.closeOnExit = false;
      let dialog = new frgbDialog(executionState);
      dialog.execute();
   }
}

main();
