// ==UserScript==
// @name        Torn Crime Success Rates Logger All OCs
// @namespace   Violentmonkey Scripts
// @match       https://www.torn.com/factions.php?step=your&type=1*
// @grant       GM_xmlhttpRequest
// @version     1.0
// @author      -
// @description 5/27/2025, 10:22:25 PM
// ==/UserScript==


// ===== Constants =====

// Place The webapps Url inbetween the ''.
// You can find this on the tools and scripts channel of the unbroken family discord server
const webAppUrl = ''
const localStorageKey = 'OCSuccessRateLogger'; // Key for where the data is stored in localStorage
const maxAttempts = 3; // Max attempts for connecting to the webapp to upload data before ending. Id suggest 3
const timeBetweenCalls = 15 * 60 * 1000 // 15 minutes in ms. Takes effect after the next scheduled run. changing will not make it run sooner

// ===== Helper Functions =====


// Function to get the currently signed in user.
// For use with recruiting crime roles
const getCurrentTornUser = () => {
  const user = JSON.parse(document.getElementById("torn-user").value)

  // { playername, id, avatar, role }
  return user
}

// Crime wrapper to object.
function crimeWrapperToObj(crime, currentUser = getCurrentTornUser()){
  // Base crime object
  const crimeObject = {
    title : '',
    tier : 0,
    roles : {  }
  }

  const crimeTitle = crime.querySelector('.panelTitle___aoGuV').innerHTML.split(' ').join('_');
  const crimeTier = crime.querySelector('.levelValue___TE4qC').innerHTML;
  const roles = crime.querySelectorAll('.wrapper___Lpz_D');

  crimeObject.title = crimeTitle
  crimeObject.tier = crimeTier

  roles.forEach( async (role) => {
    const roleName = role.querySelector('.title___UqFNy').innerHTML;
    const roleSuccess = role.querySelector('.successChance___ddHsR').innerHTML;
    const roleUserId = role.querySelector('.slotMenuItem___vkbGP')?.href.match(/XID=(\d+)/)[1] // Undefined on joinable roles

    if(!crimeObject.roles[roleName]) crimeObject.roles[roleName] = [  ]
    crimeObject.roles[roleName].push({
      success: roleSuccess,
      userId: roleUserId || currentUser.id // sets userId to currentUserId if its a joinable role
    });
  })

  return crimeObject
}

const sendDataToWebApp = async (data, url) => {
  jsonResponse = await new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'POST',
      url: url,
      data : JSON.stringify(data),
      headers : { 'Content-Type' : 'application/json' },
      onload: function (response) {
        console.log("Response: ", response)
        if (response.status >= 200 && response.status < 300) {
          try {
            const responseData = JSON.parse(response.responseText);
            resolve(responseData);
          } catch (error) {
            reject(new Error("Failed to parse JSON"));
          }
        } else {
          reject(new Error(`API request failed with status: ${response.status}`));
        }
      },
      onerror: function (error) {
        reject(new Error(`API request failed with error: ${error}`));
      }
    });
  });

  return jsonResponse;
}

// ===== Main Code =====

(async () => {
  // Script waits till the crime container is fully loaded
  while(document.getElementById('faction-crimes-root') === null){
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("No Crime Container Yet :'(")
  }

  console.log('Crime Container Loaded :)');

  // Check if the script has setup the crime roles object in the localStorage.
  if(localStorage[localStorageKey] === undefined || localStorage[localStorageKey] === null) {
    localStorage[localStorageKey] = JSON.stringify({
      crimes : {  },
      lastUpload : {
        timestamp : null,
        success : false
      }
    })
  }

  // Get current signed in user.
  // For use with joinable crime roles
  const currentUser = getCurrentTornUser()

  // Get OC tab buttons
  const buttonBar = document.querySelector(".buttonsContainer___aClaa")

  // On click get the crimes on the page and store them in localStorage
  buttonBar.addEventListener('click', (e) => {
    setTimeout(async () => {
      // Get stored data
      // { crimes: { title: crimeObject, ... }, lastUpload: { timestamp, success }}
      const storedData = JSON.parse(localStorage[localStorageKey])

      // Get current tab ('Recruiting', 'Planning', 'Completed')
      const currentTab = e.target.innerText
      console.log('Current Tab: ', currentTab)
      console.log('Current Timestamp(ms): ', new Date().getTime())

      // Wait till OCs have loaded
      while(document.querySelectorAll('.wrapper___U2Ap7').length === 0) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // Get OC Wrappers
      const crimeWrappers = document.querySelectorAll('.wrapper___U2Ap7')

      crimeWrappers.forEach(crime => {
        // Extract crime title, crime tier and crime roles from crime wrapper
        const { title, tier, roles } = crimeWrapperToObj(crime, currentUser)

        // If crime type isnt in stored data then create new entry
        if(!storedData.crimes[title]) storedData.crimes[title] = { tier, roles: {  } }

        // For each role of the crime insert role name and user/s into the stored data object
        Object.entries(roles).forEach(([ roleName, users ]) => {
          if(!storedData.crimes[title].roles[roleName]) storedData.crimes[title].roles[roleName] = {  }
          users.forEach(({ success, userId }) => {
            // If no user entry then create new entry
            // or
            // if success is greater than value stored then update
            if(!storedData.crimes[title].roles[roleName][userId] || Number(success) > Number(storedData.crimes[title].roles[roleName][userId])) {
              storedData.crimes[title].roles[roleName][userId] = success
            }
          })
        })
      })

      // Check if data needs to be uploaded yet.
      // IF timeBetweenCalls + lastUploadTimestamp is less than now
      // OR lastUploadSuccess is false
      console.log(`Checking Upload Status`)
      if(storedData.lastUpload.success === false || Number(storedData.lastUpload.timestamp) + timeBetweenCalls < new Date().getTime()){
        console.log('Attempting to upload data')
        console.log({data: storedData})
        let attemptCounter = 0
        while(attemptCounter < maxAttempts){
          attemptCounter ++
          try{
            console.log(`Attempt Number ${attemptCounter}.`)
            // Attempt to connect to webapp via webAppUrl
            const response = await sendDataToWebApp(storedData.crimes, webAppUrl)
            console.log({response})

            // On bad response throw error
            if(!response.success) throw new Error(response.message)

            // On good response update the lastUpload in storedData
            storedData.lastUpload.timestamp = new Date().getTime()
            storedData.lastUpload.success = true

            // Clear the crimes data as its been uploaded
            storedData.crimes = {  }

            // Max retries to break while loop
            attemptCounter = maxAttempts
          } catch(e){
            // On bad response log error and wait 2000ms (2s) to retry
            console.error(`Error: `, e)
            await new Promise(resolve => setTimeout(resolve, 2000))

            // If fail and final attempt then set success to false to retry later
            if(attemptCounter === maxAttempts){
              storedData.lastUpload.success = false
            }
          }
        }
      } else{
        console.log(`Next Upload Scheduled For Anytime After ${
          new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour12: false
          }).format(Number(storedData.lastUpload.timestamp) + timeBetweenCalls)
        }`)
      }

      // Update data in localStorage so it persists till the next upload time
      console.log(`Updating Data In LocalStorage With Key '${localStorageKey}'`)
      localStorage[localStorageKey] = JSON.stringify(storedData)

      console.log({storedData})
    },0)
  })
})()
