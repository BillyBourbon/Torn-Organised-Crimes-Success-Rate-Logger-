
function setPostRouteSpreadsheetId(){
  const your_sheets_id_inbetween_the_quotes = "YOUR_SPREADSHEET_ID_FOR_THE_POST_ROUTE_QUEUE"
  let x = setProp('postRouteSpreadsheetId', your_sheets_id_inbetween_the_quotes)
  console.log(x)
}

const retryLimit = 3

const sheetSetup = {
  postQueue: {
    name: 'PostQueue',
    headers: [
      'Timestamp', 'Current_Retries', 'Currently_Running', 'Data'
    ]
  },
  postLogs: {
    name: 'PostLogs',
    headers: [
    'Timestamp', 'Processing_Status', 'Retry_Count', 'Data'
    ]
  }
}

function handlePostDataQueue(){
  console.log('Starting To Handle Post Data Queue')
  const postRouteSpreadsheetId = getProp('postRouteSpreadsheetId')
  
  if(postRouteSpreadsheetId === null || postRouteSpreadsheetId.length === 0) throw new Error('No Post Route Spreadsheet ID Set')
  
  const queueSheet = getSheet(sheetSetup.postQueue.name, sheetSetup.postQueue.headers, postRouteSpreadsheetId)

  const logsSheet = getSheet(sheetSetup.postLogs.name, sheetSetup.postLogs.headers, postRouteSpreadsheetId)
  
  if(queueSheet.getLastRow() <= 1) {
    console.log('No data in queue') 
    return
  }

  // for(let i = 0; i < 12; i++){
  let retryCounterCurrentlyRunning = 0
  console.log(queueSheet.getRange(2,3).getValue())
  while(queueSheet.getRange(2,3).getValue() === 'true'){
    console.log(`Next In Queue Already Being Ran. Attempt: ${retryCounterCurrentlyRunning + 1}`)
    Utilities.sleep(10000)

    if(retryCounterCurrentlyRunning === 11){
      console.log('Cancelling Run As Already Running. Resetting Run State Of Previous Data Row')
      queueSheet.getRange(2,3).setValue('false')
      return
    }
  }

  console.log('Data ready to handle')
  console.log(queueSheet.getRange(2,3).getValue())

  // Get next row in queue
  const [ row ] = queueSheet.getRange(2,1,1,queueSheet.getLastColumn()).getValues()
  const [ timestamp, retryCount, currentlyRunning, ...data ] = row
  
  // Set 1st in queue as running to prevent the script executing twice due to the 1min trigger.
  queueSheet.getRange(2,3).setValue('true')

  // Default status set to fail.
  let status = false
  
  // Parse data segments into JSON
  const dataJoin = data.join('').trim()
  if(dataJoin.length > 0){
    try{
      const jsonData = JSON.parse(dataJoin)

      if(Object.keys(jsonData).length === 0) throw new Error('Invalid JSON Data')
      
      status = handlePostData(jsonData, true)
    } catch(e){
      console.error('Malformed Data. Error: ', e)
    }
  }
  
  console.log('Handle Data Status: ', status)

  // If data was handled well then move row from queue to logs. mark as success
  // Else update retry counter
  // If retry counter is maxed then move row and mark as failure
  if(status){
    console.log('Appending New Success Row To Log Sheet')
    logsSheet.appendRow([ timestamp, 'success', retryCount, ...data])

    console.log('Removing Data Row From Queue Sheet')
    queueSheet.deleteRow(2)
  } else{
    if(retryCount + 1 >= retryLimit){
      console.log('Appending New Falure Row To Log Sheet')
      logsSheet.appendRow([ timestamp, 'failure', retryCount + 1, ...data ])

      console.log('Removing Data Row From Queue Sheet')
      queueSheet.deleteRow(2)
    } else queueSheet.getRange(2,2).setValue(retryCount + 1)
  }
}

function handlePostData(data, parsed = false){
  try{
    if(!parsed) data = JSON.parse(data)
    Object.entries(data).forEach(([ crime, { tier, roles } ]) => {
      const crimeTitle = `${crime}_${tier}`

      const sheet = getSheet(crimeTitle, [
        "Player_Id"
      ])

      removeBlankSpaceInSheet(sheet,{blankColumns:true, blankRows:true})

      const columnFinderRange = sheet.getRange('1:1')
      const rowFinderRange = sheet.getRange('A:A')

      Object.entries(roles).forEach(([ roleName, users ]) => {
        roleName = roleName.split(' ').join('_')

        let col = 0
        let row = 0
        
        const columnFinder = columnFinderRange.createTextFinder(roleName).matchEntireCell(true).findNext()
        if(columnFinder === null){
          col = sheet.getLastColumn() + 1
          sheet.insertColumnAfter(sheet.getLastColumn())
          SpreadsheetApp.flush()
          sheet.getRange(1,col).setValue(roleName)
        } else col = columnFinder.getColumn()
        
        Object.entries(users).forEach(([ userId, success ]) => {
          const rowFinder = rowFinderRange.createTextFinder(userId).matchEntireCell(true).findNext()
          if(rowFinder === null){
            row = sheet.getLastRow() + 1
            sheet.appendRow([userId])
            SpreadsheetApp.flush()
          } else row = rowFinder.getRow()
          
          sheet.getRange(row,col).setValue(success)
          SpreadsheetApp.flush()
        })
      })
    })

    return true
  } catch(e){
    console.error(e)
    return false
  }
}



// Gets Sheet If It Exists Else Creates A New Sheet And Inserts Headers If Provided
function getSheet(sheetName, headers=[[]], spreadsheetId = null){
  if(typeof(headers) !== "object") headers = [headers]
  if(typeof(headers[0]) !== "object") headers = [headers]
  
  let sheet = null
  if(spreadsheetId === null) sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName)
  else sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName)

  if(sheet === null) {
    if(spreadsheetId === null) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName)
    } else {
      sheet = SpreadsheetApp.openById(spreadsheetId).insertSheet(sheetName)
    }

    if(headers.length !== 0 && headers[0].length !== 0) sheet.getRange(1, 1, headers.length,headers[0].length).setValues(headers)
  }

  return sheet
}


function clearProp(propName, section="script"){
  let prop = PropertiesService
  if(section === "script") prop = prop.getScriptProperties()
  if(section === "user") prop = prop.getUserProperties()
  else return false
  try{
    prop.deleteProperty(propName)
    return true
  } catch(e) {return false}
}

function getProp(propName, section="script"){
  let prop = PropertiesService
  if(section === "script") prop = prop.getScriptProperties()
  else if(section === "user") prop = prop.getUserProperties()
  else return null
  return prop.getProperty(propName)
}

function setProp(propName, value, section="script"){
  console.log({propName, value, section})
  let prop = PropertiesService
  if(section === "script") prop = prop.getScriptProperties()
  else if(section === "user") prop = prop.getUserProperties()
  else return false
  try{
    prop.setProperty(propName, value)
    return true
  } catch(e) {return false}
}

function removeBlankSpaceInSheet(sheet, options={blankRows:false,blankColumns:false}){
  if(options.blankRows){
    const lastRow = sheet.getLastRow()
    const maxRows = sheet.getMaxRows()
    const rowDif = maxRows - lastRow
    if(rowDif > 0) sheet.deleteRows(lastRow+1, rowDif)
  }
  if(options.blankColumns){
    const lastCol = sheet.getLastColumn()
    const maxCols = sheet.getMaxColumns()
    const colDif = maxCols - lastCol
    if(colDif > 0) sheet.deleteColumns(lastCol+1, colDif)
  }
}
