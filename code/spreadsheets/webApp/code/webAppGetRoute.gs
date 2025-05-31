function doGet(e){
  const pageToLoad = e?.parameter?.v?.length>0?e.parameter.v:"page-view-by-crime"

  const html = HtmlService.createTemplateFromFile('layout')
  html.title = pageToLoad
  html.baseLink = `${ScriptApp.getService().getUrl()}?v=`

  const pageContents = HtmlService.createTemplateFromFile(pageToLoad)
  html.pageContent = pageContents.evaluate().getContent()

  return html.evaluate()
}

function include(filename){
  return HtmlService.createHtmlOutputFromFile(filename).getContent()
}

