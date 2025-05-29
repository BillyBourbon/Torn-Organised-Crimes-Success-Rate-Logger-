
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

function doPost(e) {
  console.log(e)
  const contents = JSON.parse(e.postData.contents)
  console.log("Contents: ", contents)

  const status = insertPostRequestIntoQueue(contents)
  console.log({status})
  
  return ContentService.createTextOutput(JSON.stringify(status)).setMimeType(ContentService.MimeType.JSON);
}

function insertPostRequestIntoQueue(postData){
  const status = { success: false, message: '' }
  
  try{
    const sheet = getSheet(sheetSetup.postQueue.name, sheetSetup.postQueue.headers)

    const dataSegments = []
    const segmentSize = 49000 // 50k characters per cell google sheets limit :/
    
    const jsonString = JSON.stringify(postData)
    for (let i = 0; i < jsonString.length; i += segmentSize) {
      dataSegments.push(jsonString.slice(i, i + segmentSize));
    }

    sheet.appendRow([ new Date().getTime(), 0, false, ...dataSegments ])

    status.success = true
    status.message = `Added to queue. Queue Number: ${sheet.getLastRow() - 1}`
  } catch(e){
    console.error(e)
    status.message = 'Error inserting request into queue. Please try again later.'
  }

  return status
}



// Gets Sheet If It Exists Else Creates A New Sheet And Inserts Headers If Provided
function getSheet(sheetName, headers=[[]], spreadsheetId = null){
  // console.log(`Getting Sheet '${sheetName}'. SpreadhseetID: ${spreadsheetId}`)
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

