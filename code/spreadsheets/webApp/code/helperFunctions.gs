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

function getApiKey(){
  return PropertiesService.getUserProperties().getProperty("apikey")
}

function setApiKey(apikey){
  PropertiesService.getUserProperties().setProperty("apikey", apikey)
  return apikey
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

// TORN API V2 Helper Function
function tornApiCallV2({ section = "user", selection = "", id = 0, apikey, limit = 100, sort = "DESC", fromTimestamp, toTimestamp, comment, showCall, fullUrl }){
  // const { section = "user", selection = "", id = 0, apikey, limit = 100, sort = "DESC", fromTimestamp, toTimestamp, comment, showCall, fullUrl } = options
  if(apikey === undefined || apikey === null || apikey.length !== 16) throw new Error('Error invalid apikey')
  const baseUrl = `https://api.torn.com/v2`

  let callUrl = `${baseUrl}/${section}/${id}/${selection}?limit=${limit}&sort=${sort}`

  if(fromTimestamp !== undefined && fromTimestamp > 0) callUrl = `${callUrl}&from=${fromTimestamp}`
  if(toTimestamp !== undefined && toTimestamp > 0) callUrl = `${callUrl}&to=${toTimestamp}`
  if(comment !== undefined && comment.length > 0) callUrl = `${callUrl}&comment=${comment}`
  
  const callOptions = {
    contentType : "application/json",
    headers : {
      Authorization :  `ApiKey ${apikey}`
    }
  }

  if(fullUrl) callUrl = fullUrl

  const call = UrlFetchApp.fetch(callUrl, callOptions)
  const data = JSON.parse(call.getContentText())
  
  if(showCall) console.log(callUrl, data)
  
  return data
}


function stripCommas(htmlOutput){
  return (htmlOutput.split(">,<").join("><"))
}

function htmlTableFromArray(tableHeaders, tableRows, tableClass=null){
  const htmlTheadRow = tableHeaders.map(([header,..._], i) => {
    return `<th${i === 0 ? ' class="persistentColumn"' : ''} data-index="${i}">
      ${header}
    </th>`
  })
  
  const htmlTbodyRows = tableRows.map(row => {
    return `<tr>
      ${row.map((element,i) => {
        return `<td data-label="${tableHeaders[i][0]}"${i === 0 ? ' class="persistentColumn"' : ''}}">
          ${element}</td>`}
      )}
    </tr>`
  })

  const htmlOutput = 
  `<table${tableClass ? ` class="${tableClass}"` : ''}>
    <thead>
      <tr>
        ${htmlTheadRow}
      </tr>
      </thead>
      <tbody>
        ${htmlTbodyRows}
      </tbody>
  </table>`

  return stripCommas(htmlOutput)
}
