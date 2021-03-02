module.exports = function({xelib, Extensions, patchFile, settings, helpers, locals}){
  //Useful constants
  const {equalTo, greaterThanEqualTo, exclusionMap, stringToBoolean} = Extensions.constants;

  //-----------------Alchemy Patcher Supporting Functions------------------------------
  function isPotionAllowed(locals, rec){
    let alchExclusions = locals.alchemyJson["ns2:alchemy"].potion_exclusions.exclusion
    return alchExclusions.every(exclusion => {
      let target = xelib[exclusionMap[exclusion.target]](rec);
      let method = exclusionMap[exclusion.type];
      if(method === 'EQUALS') return target !== exclusion.text;
      return !target[method](exclusion.text);
    });
  };

  function getAlchemyEffect(locals, rec){//what perma thinks this magic effect is
    return Extensions.getObjectFromBinding(rec, locals.alchemyBindings, locals.alchemyEffect);
  };

  function getRecordArray_Effects(rec){//this gets the array of effects from the record in zedit
    let effectsData = {}
    xelib.GetElements(rec, `Effects`).forEach(e => {
      let effectName = xelib.EditorID(xelib.GetLinksTo(e, `EFID`));
      effectsData[effectName] = {
        mgefHandle: xelib.GetWinningOverride(xelib.GetLinksTo(e, `EFID`)),
        magnitude: xelib.GetValue(e, `EFIT\\Magnitude`),
        duration: xelib.GetValue(e, `EFIT\\Duration`),
        baseCost: xelib.GetValue(xelib.GetLinksTo(e, `EFID`), `Magic Effect Data\\DATA\\Base Cost`)
      };
    });
    return effectsData;
  };

  function getPotionMultiplier(locals, rec){
    return Extensions.getObjectFromBinding(rec, locals.potionMultBindings, locals.potionMultiplier);
  };

  /*for some reason, the original patcher doesn't catch vigor and magicka recovery poisons 
    in my dev modlist (might be USSEP?), however this patcher catches them, and I feel 
    confident that this is intended behavior, so I'm calling this a bugfix*/
  function makePotionWorkOverTime(locals, rec, patchFile){
    let potionEffects = getRecordArray_Effects(rec); //the effects of the potion
    Object.keys(potionEffects).forEach(EDIDkey => {
      let potionEffect = potionEffects[EDIDkey]; //this is an object containing the mgef hande, duration, magnitude, and cost of an effect on a potion
      let mgefOverride = xelib.CopyElement(potionEffect.mgefHandle, patchFile);
      //xelib.SetValue(mgefOverride, `Magic Effect Data\\DATA\\Magic Skill`, `None`);//this is the more sensible place to do this, since we are already patching this record
      let alchemyEffect = getAlchemyEffect(locals, potionEffect.mgefHandle);//what perma thinks the effect is
      let oldMag = potionEffect.magnitude;
      let oldDur = potionEffect.duration;
      let oldCost = potionEffect.baseCost;
      let potionMultiplier = getPotionMultiplier(locals, rec);
      let recEffectArrayItem = xelib.GetArrayItem(rec, `Effects`, `EFID`, xelib.LongName(potionEffect.mgefHandle));
      if (potionMultiplier !== null && alchemyEffect !== null){
        let newMag = alchemyEffect.baseMagnitude;
        let newDur = Math.round(alchemyEffect.baseDuration);
        if (stringToBoolean[alchemyEffect.allowPotionMultiplier]){
          newMag *= potionMultiplier.multiplierMagnitude;
          newDur = Math.round(alchemyEffect.baseDuration*potionMultiplier.multiplierDuration);
        };
        let newCost = alchemyEffect.baseCost;
        if (oldMag !== newMag && newMag >= 0) {
          xelib.SetValue(recEffectArrayItem, `EFIT\\Magnitude`, newMag.toString())
        };
        if (oldDur !== newDur && newDur >= 0) {
          xelib.SetValue(recEffectArrayItem, `EFIT\\Duration`,  newDur.toString());
        };
        if (oldCost !== newCost && newCost >= 0) {
          xelib.SetValue(mgefOverride, `Magic Effect Data\\DATA\\Base Cost`, newCost.toString());
          let description = xelib.GetValue(mgefOverride, `DNAM`);
          if (!description.contains(`<dur>`)){
            xelib.SetValue(mgefOverride, `DNAM`, `${description} [Duration: <dur> seconds]`);
            xelib.SetFlag(mgefOverride, `Magic Effect Data\\DATA\\Flags`, `No Duration`, false);
          };
        }; 
      };
    });
  };

  function disableAssociatedMagicSchools(rec, patchFile){
    let potionEffects = getRecordArray_Effects(rec); //the effects of the potion
    Object.keys(potionEffects).forEach(EDIDkey => {
      let mgef =  potionEffects[EDIDkey].mgefHandle;
      if (xelib.GetValue(mgef, `Magic Effect Data\\DATA\\Magic Skill`) !== `None`) {
        let mgefOverride = xelib.CopyElement(mgef, patchFile);
        xelib.SetValue(mgefOverride, `Magic Effect Data\\DATA\\Magic Skill`, `None`);
      };
    });
  };

  function isIngrAllowed(locals, rec){
    let ingrExclusions = locals.alchemyJson["ns2:alchemy"].ingredient_exclusions.exclusion
    return ingrExclusions.every(exclusion => {
      let target = xelib[exclusionMap[exclusion.target]](rec);
      let method = exclusionMap[exclusion.type];
      if(method === 'EQUALS') return target !== exclusion.text;
      return !target[method](exclusion.text);
    });
  };

  function getIngrMultiplier(locals, rec){
    return Extensions.getObjectFromBinding(rec, locals.ingrVarBindings, locals.ingrVariation);
  };

  function makeIngrWorkOverTime(locals, rec, patchFile){
    let ingrEffects = getRecordArray_Effects(rec); //the effects of the ingredient
    Object.keys(ingrEffects).forEach(EDIDkey => {
      let ingrEffect = ingrEffects[EDIDkey]; //this is an object containing the mgef hande, duration, magnitude, and cost of an effect on a ingredient
      //let mgefOverride = xelib.CopyElement(ingrEffect.mgefHandle, patchFile);
      //xelib.SetValue(mgefOverride, `Magic Effect Data\\DATA\\Magic Skill`, `None`);//this is the more sensible place to do this, since we are already patching this record
      let alchemyEffect = getAlchemyEffect(locals, ingrEffect.mgefHandle);
      let oldMag = ingrEffect.magnitude;
      let oldDur = ingrEffect.duration;
      let ingrMultiplier = getIngrMultiplier(locals, rec);
      let recEffectArrayItem = xelib.GetArrayItem(rec, `Effects`, `EFID`, xelib.LongName(ingrEffect.mgefHandle));
      if (ingrMultiplier !== null && alchemyEffect !== null){
        let newMag = alchemyEffect.baseMagnitude;
        let newDur = Math.round(alchemyEffect.baseDuration);
        if (stringToBoolean[alchemyEffect.allowIngredientVariation]){
          newMag *= ingrMultiplier.multiplierMagnitude;
          newDur = Math.round(alchemyEffect.baseDuration*ingrMultiplier.multiplierDuration);
        };
        if (oldMag !== newMag && newMag >= 0) {
          xelib.SetValue(recEffectArrayItem, `EFIT\\Magnitude`, newMag.toString())
        };
        if (oldDur !== newDur && newDur >= 0) {
          xelib.SetValue(recEffectArrayItem, `EFIT\\Duration`,  newDur.toString());
        }; 
      };
    });
  };

  //-----------------Actual Alchemy Patcher Functions-----------------------------------
  /*Every function feeds a zedit `process` block. A process block is either a `load:` and 
  `patch` object, or a `records:` object. You can also do a `records:` and `patch:` object,
  but I'm not sure why I'd need one in this patcher*/
  function loadAndPatch_Ingestible(patchFile, settings, helpers, locals){
    return {
      load: {
        signature: `ALCH`,
        filter: rec => {//Called for each loaded record. Return false to skip patching a record
          let potionEffects = getRecordArray_Effects(rec)
          return xelib.HasElement(rec, `Effects`)
          && isPotionAllowed(locals, rec) 
          && Object.keys(potionEffects).every(effect => {
            if (getAlchemyEffect(locals, potionEffects[effect].mgefHandle)!== null){return true};
          });
        }
      },
      patch: function (rec) {
        if (settings.UseThief) {
          /*let potionEffects = getRecordArray_Effects(rec);
          let needToDisableAMS = true
          if (isPotionAllowed(locals, rec) 
            && Object.keys(potionEffects).some(effect => {
              if (getAlchemyEffect(locals, potionEffects[effect].mgefHandle)!== null){return true};
            })
          ){
            makePotionWorkOverTime(locals, rec, patchFile);
            needToDisableAMS = false
          };
          if (needToDisableAMS) {//this catches any mgefs that didn't get done in makePotionWorkOverTime
            //disableAssociatedMagicSchools(rec, patchFile);
          };*/
          makePotionWorkOverTime(locals, rec, patchFile);
        };
      }
    };
  };

  function loadAndPatch_Ingredients(patchFile, settings, helpers, locals){
    return {
      load: {
        signature: `INGR`,
        filter: rec => {//Called for each loaded record. Return false to skip patching a record
          let ingrEffects = getRecordArray_Effects(rec)
          return xelib.HasElement(rec, `Effects`)
          && isIngrAllowed(locals, rec) 
          && Object.keys(ingrEffects).some(effect => {
              if (getAlchemyEffect(locals, ingrEffects[effect].mgefHandle)!== null){return true};
          })
        }
      },
      patch: function (rec) {
        if (settings.UseThief) {
          /*let ingrEffects = getRecordArray_Effects(rec);
          let needToDisableAMS = true
          if (isIngrAllowed(locals, rec) 
            && Object.keys(ingrEffects).some(effect => {
              if (getAlchemyEffect(locals, ingrEffects[effect].mgefHandle)!== null){return true};
            })
          ){
            makeIngrWorkOverTime(locals, rec, patchFile);
            needToDisableAMS = false
          };
          if (needToDisableAMS) {//this catches any mgefs that didn't get done in makeIngrWorkOverTime
            //disableAssociatedMagicSchools(rec, patchFile);
          };*/
          makeIngrWorkOverTime(locals, rec, patchFile);
        };
      }
    };
  };

  function records_Alchemy(patchFile, settings, helpers, locals){
    return {
      records: (filesToPatch, helpers, settings, locals) => {
        helpers.logMessage(`Patching alchemy effects`);
        let potions = helpers.loadRecords('ARMO')
        .filter(rec => xelib.HasElement(rec, `Effects`))
        potions.forEach(rec => {
          disableAssociatedMagicSchools(rec, patchFile);
        });
        helpers.logMessage(`Done patching alchemy effects`);

        helpers.logMessage(`Patching ingredient effects`);
        let ingredients = helpers.loadRecords('ARMO')
        .filter(rec => xelib.HasElement(rec, `Effects`))
        ingredients.forEach(rec => {
          disableAssociatedMagicSchools(rec, patchFile);
        });
        helpers.logMessage(`Done patching ingredient effects`);
        return [];
      }
    };
  };
  return {
    loadAndPatch_Ingestible,
		loadAndPatch_Ingredients,
		records_Alchemy
  };
}