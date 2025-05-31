// Replace 0 with your faction id if you want. usefull if you guest around. 
// 0 means the faction pulled will be that of the keybearer
// Feel free to add multiple faction IDs if you happen to have a few under your family banner :)
// Just make sure theyre comma seperated ie it should look like this... const factionIds = [ 45151, 10913 ]
const factionIds = [ 0 ] 


function getFamilyMembers(){
  const sheet = getSheet("FamilyMembers", [
    "ID",
    "Name",
    "Faction_ID",
    "Faction_Name"
  ])

  const factionMembers = []

  factionIds.forEach( (factionId, i) => {    
    const call = tornApiCallV2({
      section : "faction",
      selection : "basic,members",
      id : factionId,
      apikey : getApiKey()
    })
    
    const { basic : { name: factionName, id: facId }, members } = call

    members.forEach(member=>{
      const { id : memberId, name : memberName } = member
      factionMembers.push([
        memberId, memberName, facId, factionName
      ])
    })
  })

  if(sheet.getLastRow()-1 > 1) sheet.getRange(2,1,sheet.getLastRow()-1, sheet.getLastColumn()).clearContent()
  
  sheet.getRange(2,1,factionMembers.length, factionMembers[0].length).setValues(factionMembers)

  removeBlankSpaceInSheet(sheet, {blankColumns:true, blankRows:true})

  return factionMembers
}

function loadFactionMembers(factionId){
  const sheet = getSheet("FamilyMembers")
  const [ headers, ...rows ] = sheet.getDataRange().getValues()
  return rows.filter(r=>r[2] === factionId) || []
}
