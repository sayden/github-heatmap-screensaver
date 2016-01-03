// TODO Returns data from github API associated with the given user and repo
function getDataForUserAndRepo(user, repo){

}

// TODO Parses data from github repo to match D3 needs
function parseD3DataForHeatmap(json){

}


function cleanGithubData(user, repo, i, hasNext, accData, cb){
  var url = "https://api.github.com/repos/" + user + "/" + repo + "/commits?since=2008-01-01&page=";

  if(hasNext == false){
    return cb(accData)
  }

  $.ajax(url + i, {
    method:'GET',
    dataType:"json",
    beforeSend: addAuthorizationHeader,
    success: function(data, textStatus, request){
      console.log("Success for page " + i);
      hasNext = false
      if (request.getResponseHeader("Link") != null){
        hasNext = request.getResponseHeader("Link").split("rel=")[1].includes("next");
      }

      var cleaned = data.map(function(d){
        return d.commit.committer.date;
      }).sort(function(a,b){
        Date.compare(Date.parse(a),Date.parse(b))
      }).map(function(d){
        var date = d.slice(0, d.indexOf("T"))
        return {"day":moment(date).day(), "date":date}
      });

      cleanGithubData(user, repo, i+1, hasNext, accData.concat(cleaned), cb)
    }
  });
}

function getGithubData(user, repo){
  var localStorageData = window.localStorage.getItem(user + ":" + repo);
  if(localStorageData){
    var data = JSON.parse(localStorageData);
    console.log(user + ":" + repo + " already stored, reusing...", data);

  } else {
    cleanGithubData(user, repo, 1, true, [], function(github){
      var data = {
        data: github.sort(),
        timestamp: Date.now()
      }
      console.log("New data, storing...");
      window.localStorage.setItem(user + ":" + repo, JSON.stringify(data));
    });
  }
}

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


getGithubData("sayden", "github-heatmap-screensaver");

// TODO Returns a fully configured D3 Heatmap for the given data
function setD3Chart(data){
  var onlyWeekdays = false;

  var margin = { top: 50, right: 0, bottom: 100, left: 30 },
            width = 960 - margin.left - margin.right,
            height = 430 - margin.top - margin.bottom,
            gridSize = Math.floor(width / 24),
            legendElementWidth = gridSize*2,
            buckets = 9,
            colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"], // alternatively colorbrewer.YlGnBu[9]
            days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
            days = ["1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a", "12a", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p", "12p"];
            dataset = ["http://localhost:8000/data.tsv"];
  if (onlyWeekdays) {
    margin.days = margin.days.slice(0,5);
  }

  var svg = d3.select("#chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var dayLabels = svg.selectAll(".dayLabel")
      .data(days)
      .enter().append("text")
        .text(function (d) { return d; })
        .attr("x", 0)
        .attr("y", function (d, i) { return i * gridSize; })
        .style("text-anchor", "end")
        .attr("transform", "translate(-6," + gridSize / 1.5 + ")")
        .attr("class", function (d, i) { return ((i >= 0 && i <= 4) ? "dayLabel mono axis axis-workweek" : "dayLabel mono axis"); });

  var timeLabels = svg.selectAll(".timeLabel")
      .data(days)
      .enter().append("text")
        .text(function(d) { return d; })
        .attr("x", function(d, i) { return i * gridSize; })
        .attr("y", 0)
        .style("text-anchor", "middle")
        .attr("transform", "translate(" + gridSize / 2 + ", -6)")
        .attr("class", function(d, i) { return ((i >= 7 && i <= 16) ? "timeLabel mono axis axis-worktime" : "timeLabel mono axis"); });

  var heatmapChart = function(tsvFile) {
    d3.tsv(tsvFile,
    function(d) {
      return {
        day: +d.day,
        hour: +d.hour,
        value: +d.value
      };
    },
    function(error, data) {
      var colorScale = d3.scale.quantile()
          .domain([0, buckets - 1, d3.max(data, function (d) { return d.value; })])
          .range(colors);

      var cards = svg.selectAll(".hour")
          .data(data, function(d) {return d.day+':'+d.hour;});

      cards.append("title");

      cards.enter().append("rect")
          .attr("x", function(d) { return (d.hour - 1) * gridSize; })
          .attr("y", function(d) { return (d.day - 1) * gridSize; })
          .attr("rx", 4)
          .attr("ry", 4)
          .attr("class", "hour bordered")
          .attr("width", gridSize)
          .attr("height", gridSize)
          .style("fill", colors[0]);

      cards.transition().duration(1000)
          .style("fill", function(d) { return colorScale(d.value); });

      cards.select("title").text(function(d) { return d.value; });

      cards.exit().remove();

      var legend = svg.selectAll(".legend")
          .data([0].concat(colorScale.quantiles()), function(d) { return d; });

      legend.enter().append("g")
          .attr("class", "legend");

      legend.append("rect")
        .attr("x", function(d, i) { return legendElementWidth * i; })
        .attr("y", height)
        .attr("width", legendElementWidth)
        .attr("height", gridSize / 2)
        .style("fill", function(d, i) { return colors[i]; });

      legend.append("text")
        .attr("class", "mono")
        .text(function(d) { return "≥ " + Math.round(d); })
        .attr("x", function(d, i) { return legendElementWidth * i; })
        .attr("y", height + gridSize);

      legend.exit().remove();

    });
  };

  heatmapChart(dataset);
}

setD3Chart("//data.tsv")
