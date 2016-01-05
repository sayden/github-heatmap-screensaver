// addAuthorizationHeader to ajax calls to github api
function addAuthorizationHeader(xhr){
  // Write your username / password here if you run out of authorization requests
  // Warning! Don't use this in public servers as your credentials will travel
  // to each client
  var githubUsername = "",
      githubPassword = "";
  xhr.setRequestHeader("Authorization", "Basic " + btoa(githubUsername + ":"
    + githubPassword));
}
