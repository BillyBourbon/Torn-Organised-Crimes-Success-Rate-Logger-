const maxDifficulty = 10

function dropdownFactionOptions_(){
  const object = loadFactionOptions_()
  const html = Object.values(object).map((optionObject, i) => {
    return (`<option value="${optionObject.value}" key=${i}>${optionObject.text}</option>`)
  })

  return html.join("")
}

function dropdownCrimeOptions_(){
  const object = loadCrimeOptions_()
  const html = Object.values(object).sort((a, b) => a.tier - b.tier).map((optionObject, i) => {
    return (`<option value="${optionObject.value}" key=${i}>${optionObject.text}</option>`)
  })

  return html.join("")
}

function loadFactionOptions_(){
  const factionOptions = {}

  const sheet = getSheet("FamilyMembers", [
    "ID",
    "Name",
    "Faction_ID",
    "Faction_Name"
  ])

  const [ headers, ...rows ] = sheet.getDataRange().getValues()

  rows.forEach(r=>{
    // if(!factionOptions.includes(`${r[3]} [${r[2]}]`)) factionOptions.push(`${r[3]} [${r[2]}]`)
    if(!factionOptions[r[2]]) factionOptions[r[2]] = {
      value : r[2],
      text : `${r[3]} [${r[2]}]`
    }
  })

  return factionOptions
}

function loadCrimeOptions_(){
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets()
  
  const organizedCrimeOptions = {}

  sheets.forEach(sheets=>{
    const sheetName = sheets.getName()
    if(sheetName.split('_').length > 2) {
      const nameSplit = sheetName.split('_')
      organizedCrimeOptions[sheetName] = {
        value : sheetName,
        text : `${nameSplit.join(' ')}/${maxDifficulty}`,
        tier : Number(nameSplit[nameSplit.length - 1])
      }
    }
  })

  return organizedCrimeOptions
}

function dropdownMemberOptions(){
  const familyMembersSheet = getSheet("FamilyMembers")
  const [ familyHeaders, ...familyMembers ] = familyMembersSheet.getDataRange().getValues()
  console.log(familyMembers)

  const options = []
  familyMembers.sort((a, b) => a[0] - b[0]).forEach(member => {
    options.push(`<option value="${member[0]}">${member[1]} [${member[0]}]</option>`)
  })

  return options.join('')
}

function loadMemberRoleTable(factionId, crimeTitle){
  const familyMembersSheet = getSheet("FamilyMembers")
  const [ familyHeaders, ...familyMembers ] = familyMembersSheet.getDataRange().getValues()

  const factionMembers = familyMembers.filter(m=>Number(m[2]) === Number(factionId))

  const factionMembersObject = {}
  factionMembers.forEach(m=>factionMembersObject[m[0]] = m[1])
  
  const crimeSheet = getSheet(crimeTitle)
  const [ crimeHeaders, ...crimeData] = crimeSheet.getDataRange().getValues()

  const factionMembersData = crimeData
    .filter(row => factionMembersObject.hasOwnProperty(row[0]))
    .map(row => {
      const userId = row[0];
      const userName = factionMembersObject[userId];
      return [`${userName} [${userId}]`, ...row.slice(1)];
    })
  
  crimeHeaders[0] = 'Player_Name'
  
  const html = htmlTableFromArray(crimeHeaders.map(h=>[h.split('_').join(' ')]), factionMembersData, 'table')

  return html
}

function loadCrimeRoleData(crimeTitle){
  const sheet = getSheet(crimeTitle)
  return sheet.getDataRange().getValues()
}

function loadIndividualMemberCrimesData(userId){
  const crimesObj = {}
  const crimeSheets = SpreadsheetApp.getActiveSpreadsheet().getSheets().filter(sheet => sheet.getName().split('_').length > 1)

  crimeSheets.forEach(sheet => {
    const nameSplit = sheet.getName().split('_')
    const tier = nameSplit.pop()
    const crimeName = nameSplit.join(' ')
    const [ crimeHeaders ] = sheet.getRange(1,2,1,sheet.getLastColumn() - 1).getValues()

    const userRowId = sheet.getRange('A:A').createTextFinder(userId).matchEntireCell(true).findNext()
    let userRow
    if(userRowId === null) {
      userRow = new Array(crimeHeaders.length).fill(0)
    } else{
      userRow = sheet.getRange(userRowId.getRow(), 2, 1, sheet.getLastColumn() - 1).getValues()[0]
    }
    
    crimesObj[sheet.getName()] = {
      tier, crimeName, crimeHeaders, row: userRow
    }
  })

  const html = Object.values(crimesObj).sort((a, b) => a.tier - b.tier).map(crime => {
    return `<div class="card">
      <h1>${crime.crimeName} ${crime.tier}/10</h1>
      <div class="cardContent">
        ${htmlTableFromArray(crime.crimeHeaders.map(e => {return [e]}), [crime.row], 'table')}
      </div>
    </div>`
  }).join('')

  return html
}






