function setPostRouteSpreadsheetId(){
  const your_sheets_id_inbetween_the_quotes = "YOUR_SPREADSHEET_ID_FOR_THE_POST_ROUTE_QUEUE"
  const x = setProp('postRouteSpreadsheetId', your_sheets_id_inbetween_the_quotes)
  console.log(x)
}

function setProjectsTornAPIKey(){
  const your_projects_api_key_in_between_the_quotes = ''
  const x = setApiKey(your_projects_api_key_in_between_the_quotes)
}



const retryLimit = 3
const sheetSetup = {
  postQueue: {
    name: 'PostQueue',
    headers: [
      'Timestamp', 'Current_Retries', 'Currently_Running', 'Sender_Id', 'Data'
    ]
  },
  postLogs: {
    name: 'PostLogs',
    headers: [
    'Timestamp', 'Processing_Status', 'Retry_Count', 'Sender_Id', 'Data'
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
  while(queueSheet.getRange(2,3).getValue() === true){
    console.log(`Next In Queue Already Being Ran. Attempt: ${retryCounterCurrentlyRunning + 1}`)
    Utilities.sleep(10000)

    if(retryCounterCurrentlyRunning === 11){
      console.log('Cancelling Run As Already Running.')
      
      setProp('currentTriggerTimeouts', Number(getProp('currentTriggerTimeouts')) + 1)
      
      const currentTriggerTimeouts = getProp('currentTriggerTimeouts')
      if(currentTriggerTimeouts >= 4){
        console.log('Resetting Run State')
        queueSheet.getRange(2,3).setValue(false)
        setProp('currentTriggerTimeouts', 0)
      }

      return
    }
    retryCounterCurrentlyRunning++
  }

  console.log('Data ready to handle')
  console.log(queueSheet.getRange(2,3).getValue())

  // Get next row in queue
  const [ row ] = queueSheet.getRange(2,1,1,queueSheet.getLastColumn()).getValues()
  const [ timestamp, retryCount, currentlyRunning, sender_Id, ...data ] = row
  
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
    logsSheet.appendRow([ timestamp, 'success', retryCount, sender_Id, ...data])

    console.log('Removing Data Row From Queue Sheet')
    queueSheet.deleteRow(2)
  } else{
    if(retryCount + 1 >= retryLimit){
      console.log('Appending New Falure Row To Log Sheet')
      logsSheet.appendRow([ timestamp, 'failure', retryCount + 1, sender_Id, ...data ])

      console.log('Removing Data Row From Queue Sheet')
      queueSheet.deleteRow(2)
    } else queueSheet.getRange(2,2).setValue(retryCount + 1)
  }
}

function handlePostData(data, parsed = false){
  try{
    if(!parsed) data = JSON.parse(data)
    const crimesAlreadyRan = getProp('crimesAlreadyRan') ? JSON.parse(getProp('crimesAlreadyRan')) : []

    Object.entries(data).forEach(([ crime, { tier, roles } ]) => {
      const crimeTitle = `${crime}_${tier}`

      if(crimesAlreadyRan.includes(crimeTitle)) return

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
          
          const successRange = sheet.getRange(row,col)
          if(Number(successRange.getValue()) < Number(success)) successRange.setValue(success)
          SpreadsheetApp.flush()
        })
      })

      // add crimeTitle to props 
      crimesAlreadyRan.push(crimeTitle)
      setProp('crimesAlreadyRan', JSON.stringify(crimesAlreadyRan))
    })

    return true
  } catch(e){
    console.error(e)
    return false
  }
}

function checkCrimeSheetsForDuplicates(){
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets()
  sheets.forEach(sheet => {
    if(sheet.getName().split('_').length === 1) return
    
    fixDuplicateRows_(sheet)
  })
}

function fixDuplicateRows_(sheet) {
  const [header, ...rows] = sheet.getDataRange().getValues();
  
  if (rows.length === 0) return;

  const mergedRows = {};

  rows.forEach(row => {
    const id = row[0];

    if (!id) return;

    if (!mergedRows[id]) {
      const cleanRow = row.map(c => {return c === '' || c === null ? 0 : c})
      mergedRows[id] = [...cleanRow];
    } else {
      for (let i = 1; i < row.length; i++) {
        const current = Number(mergedRows[id][i] || 0);
        const candidate = Number(row[i] || 0);
        mergedRows[id][i] = Math.max(current, candidate);
      }
    }
  });

  // Clear the sheet (except header)
  sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();

  // Write cleaned data
  const cleaned = Object.values(mergedRows);
  sheet.getRange(2, 1, cleaned.length, cleaned[0].length).setValues(cleaned);
}
