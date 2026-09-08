const communities=["Anxiety","Depression","Lonely","MentalHealth","SuicideWatch"];
const colors=new Map([["Anxiety","#B14E46"],["Depression","#456A78"],["Lonely","#B5883E"],["MentalHealth","#68825A"],["SuicideWatch","#7A5F84"]]);
const months=d3.range(1,13),monthName=new Map(months.map((m,i)=>[m,["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i]]));
const tooltip=d3.select("#tooltip"),fmt=d3.format(",");
function number(row,keys){keys.forEach(k=>row[k]=row[k]==="NA"||row[k]===""?null:+row[k]);return row}
function showTip(event,html){tooltip.html(html).classed("visible",true).style("left",`${Math.max(8,Math.min(event.clientX+14,innerWidth-270))}px`).style("top",`${Math.min(event.clientY+14,innerHeight-150)}px`)}
function hideTip(){tooltip.classed("visible",false)}
function attachTip(selection,html){selection.attr("tabindex",0).on("pointermove",(e,d)=>showTip(e,html(d))).on("pointerleave",hideTip).on("focus",(e,d)=>showTip(e,html(d))).on("blur",hideTip)}
function makeTabs(target,includeAll,onChange){const values=includeAll?["All",...communities]:communities;const buttons=d3.select(target).selectAll("button").data(values).join("button").text(d=>d).attr("type","button");function select(value){buttons.attr("aria-pressed",d=>String(d===value));onChange(value)}buttons.on("click",(_,d)=>select(d));select(values[0]);return{select}}
function chartFrame(target,width,height){d3.select(target).selectAll("svg").remove();return d3.select(target).append("svg").attr("viewBox",`0 0 ${width} ${height}`).attr("role","img")}

function drawActivity(data){
  const width=860,height=430,margin={top:34,right:18,bottom:48,left:125},svg=chartFrame("#activity-chart",width,height);
  const x=d3.scaleBand().domain(months).range([margin.left,width-margin.right]).padding(.08),y=d3.scaleBand().domain(communities).range([margin.top,height-margin.bottom]).padding(.1);
  const values=data.filter(d=>d.post_count!==null).map(d=>d.post_count),fill=d3.scaleSequential().domain(d3.extent(values)).interpolator(t=>d3.interpolateRgb("#E9E2D7","#7D3834")(t));
  const defs=svg.append("defs"),pattern=defs.append("pattern").attr("id","missingHatch").attr("width",8).attr("height",8).attr("patternUnits","userSpaceOnUse").attr("patternTransform","rotate(45)");
  pattern.append("rect").attr("width",8).attr("height",8).attr("fill","#f6f3ec");pattern.append("line").attr("x1",0).attr("y1",0).attr("x2",0).attr("y2",8).attr("stroke","#aaa398").attr("stroke-width",2);
  svg.append("g").attr("class","axis").attr("transform",`translate(0,${height-margin.bottom})`).call(d3.axisBottom(x).tickFormat(d=>monthName.get(d)).tickSize(0));
  svg.append("g").attr("class","axis").attr("transform",`translate(${margin.left},0)`).call(d3.axisLeft(y).tickSize(0)).call(g=>g.select(".domain").remove());
  const cells=svg.append("g").selectAll("rect").data(data).join("rect").attr("class","heat-cell").attr("x",d=>x(d.month_number)).attr("y",d=>y(d.subreddit)).attr("width",x.bandwidth()).attr("height",y.bandwidth()).attr("fill",d=>d.post_count===null?"url(#missingHatch)":fill(d.post_count)).attr("stroke",d=>d.post_count===null?"#8e887e":"none");
  attachTip(cells,d=>`<strong>${d.subreddit}</strong><br>${monthName.get(d.month_number)} 2021<br>${d.post_count===null?"Data unavailable":`${fmt(d.post_count)} posts`}`);
  const legend=svg.append("g").attr("transform",`translate(${width-220},8)`),grad=defs.append("linearGradient").attr("id","activityGrad");d3.range(0,1.01,.1).forEach(t=>grad.append("stop").attr("offset",`${t*100}%`).attr("stop-color",fill(d3.min(values)+t*(d3.max(values)-d3.min(values)))));legend.append("rect").attr("width",150).attr("height",8).attr("fill","url(#activityGrad)");legend.append("text").attr("y",24).text(`${fmt(d3.min(values))} – ${fmt(d3.max(values))}`).attr("class","mini-label");
}

function drawEngagement(data){
  const width=860,height=500,margin={top:20,right:22,bottom:60,left:72},svg=chartFrame("#engagement-chart",width,height);
  const x=d3.scaleLinear().domain([0,d3.max(data,d=>d.post_count)*1.06]).nice().range([margin.left,width-margin.right]),y=d3.scaleLinear().domain([0,d3.max(data,d=>d.avg_reddit_score)*1.08]).nice().range([height-margin.bottom,margin.top]);
  svg.append("g").attr("class","grid").attr("transform",`translate(0,${height-margin.bottom})`).call(d3.axisBottom(x).ticks(6).tickSize(-(height-margin.top-margin.bottom)).tickFormat(""));
  svg.append("g").attr("class","grid").attr("transform",`translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(6).tickSize(-(width-margin.left-margin.right)).tickFormat(""));
  svg.append("g").attr("class","axis").attr("transform",`translate(0,${height-margin.bottom})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("~s")));svg.append("g").attr("class","axis").attr("transform",`translate(${margin.left},0)`).call(d3.axisLeft(y));
  svg.append("text").attr("class","axis-title").attr("x",(margin.left+width-margin.right)/2).attr("y",height-14).text("Monthly post count");svg.append("text").attr("class","axis-title").attr("transform","rotate(-90)").attr("x",-(margin.top+height-margin.bottom)/2).attr("y",18).text("Average Reddit score");
  const february=data.filter(d=>d.month_number===2);
  svg.append("g").selectAll("circle").data(february).join("circle").attr("class","feb-ring").attr("cx",d=>x(d.post_count)).attr("cy",d=>y(d.avg_reddit_score)).attr("r",11).attr("fill","none").attr("stroke","#191917").attr("stroke-width",1.8);
  const points=svg.append("g").selectAll("circle").data(data).join("circle").attr("class","scatter-point").attr("cx",d=>x(d.post_count)).attr("cy",d=>y(d.avg_reddit_score)).attr("r",d=>d.month_number===2?7:5).attr("fill",d=>colors.get(d.subreddit)).attr("stroke","#fff").attr("stroke-width",1.2);
  attachTip(points,d=>`<strong>${d.subreddit}</strong><br>${monthName.get(d.month_number)} 2021<br>${fmt(d.post_count)} posts<br>Average Reddit score: ${d.avg_reddit_score.toFixed(2)}<br>Median Reddit score: ${d.median_reddit_score.toFixed(0)}`);
  makeTabs("#engagement-filters",true,value=>points.attr("opacity",d=>(value==="All"||d.subreddit===value)?0.9:0.09).attr("r",d=>(d.month_number===2?7:5)+(value===d.subreddit?2:0)));
}

function drawSentiment(data,summary){
  const width=860,height=490,margin={top:20,right:92,bottom:50,left:72},svg=chartFrame("#sentiment-chart",width,height);
  const x=d3.scalePoint().domain(months).range([margin.left,width-margin.right]),y=d3.scaleLinear().domain([d3.min(data,d=>d.avg_sentiment)-.01,d3.max(data,d=>d.avg_sentiment)+.01]).nice().range([height-margin.bottom,margin.top]);
  svg.append("g").attr("class","grid").attr("transform",`translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(6).tickSize(-(width-margin.left-margin.right)).tickFormat(""));
  svg.append("g").attr("class","axis").attr("transform",`translate(0,${height-margin.bottom})`).call(d3.axisBottom(x).tickFormat(d=>monthName.get(d)).tickSize(0));svg.append("g").attr("class","axis").attr("transform",`translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(".2f")));
  svg.append("text").attr("class","axis-title").attr("transform","rotate(-90)").attr("x",-(margin.top+height-margin.bottom)/2).attr("y",18).text("Average sentiment");
  const byCommunity=d3.group(data,d=>d.subreddit),line=d3.line().defined(d=>d.avg_sentiment!==null).x(d=>x(d.month_number)).y(d=>y(d.avg_sentiment));
  const lines=svg.append("g").selectAll("path").data(communities).join("path").attr("class","sentiment-line").attr("fill","none").attr("stroke",d=>colors.get(d)).attr("stroke-width",2.5).attr("d",d=>line(months.map(m=>byCommunity.get(d).find(x=>x.month_number===m)||{month_number:m,avg_sentiment:null})));
  const points=svg.append("g").selectAll("circle").data(data).join("circle").attr("class","sentiment-point").attr("cx",d=>x(d.month_number)).attr("cy",d=>y(d.avg_sentiment)).attr("r",4).attr("fill",d=>colors.get(d.subreddit));
  attachTip(points,d=>`<strong>${d.subreddit}</strong><br>${monthName.get(d.month_number)} 2021<br>Average sentiment: ${d.avg_sentiment.toFixed(3)}<br>Median sentiment: ${d.median_sentiment.toFixed(3)}<br>Negative posts: ${d.pct_negative.toFixed(1)}%<br>Positive posts: ${d.pct_positive.toFixed(1)}%`);
  const panel=d3.select("#community-summary");function update(value){lines.attr("opacity",d=>value==="All"||d===value?1:.08).attr("stroke-width",d=>d===value?4:2.5);points.attr("opacity",d=>value==="All"||d.subreddit===value?1:.08).attr("r",d=>d.subreddit===value?5:4);if(value==="All")panel.html(`<b>Overall comparison</b><p>Anxiety had the most negative annual average sentiment (${d3.min(summary,d=>d.avg_sentiment).toFixed(3)}). Lonely was comparatively less negative (${d3.max(summary,d=>d.avg_sentiment).toFixed(3)}).</p>`);else{const d=summary.find(x=>x.subreddit===value);panel.html(`<b>${value}</b><div><span>Average sentiment<strong>${d.avg_sentiment.toFixed(3)}</strong></span><span>Negative posts<strong>${d.pct_negative.toFixed(1)}%</strong></span></div>`)}}
  makeTabs("#sentiment-filters",true,update);
}

function drawLanguage(data){
  const width=860,height=490,margin={top:10,right:35,bottom:40,left:155};function update(community){const rows=data.filter(d=>d.subreddit===community).sort((a,b)=>a.rank-b.rank).slice(0,10),svg=chartFrame("#tfidf-chart",width,height);const x=d3.scaleLinear().domain([0,d3.max(rows,d=>d.tf_idf)*1.08]).range([margin.left,width-margin.right]),y=d3.scaleBand().domain(rows.map(d=>d.word)).range([margin.top,height-margin.bottom]).padding(.3);svg.append("line").attr("x1",margin.left).attr("x2",width-margin.right).attr("y1",height-margin.bottom).attr("y2",height-margin.bottom).attr("stroke","#d6d0c3");svg.append("text").attr("class","axis-title").attr("x",(margin.left+width-margin.right)/2).attr("y",height-10).text("Relative TF-IDF");svg.append("g").attr("class","axis").attr("transform",`translate(${margin.left},0)`).call(d3.axisLeft(y).tickSize(0).tickFormat((d,i)=>`${rows[i].rank}.  ${d}`)).call(g=>g.select(".domain").remove());const bars=svg.append("g").selectAll("rect").data(rows).join("rect").attr("class","term-bar").attr("x",margin.left).attr("y",d=>y(d.word)).attr("height",y.bandwidth()).attr("width",0).attr("fill",colors.get(community));bars.transition().duration(450).attr("width",d=>x(d.tf_idf)-margin.left);attachTip(bars,d=>`<strong>${d.word}</strong><br>TF-IDF: ${d.tf_idf.toExponential(3)}<br>Total occurrences: ${fmt(d.n)}<br>Distinct posts: ${fmt(d.doc_freq)}`)}makeTabs("#language-filters",false,update);
}

async function init(){const [activity,engagement,sentiment,terms,summary]=await Promise.all([
  d3.csv("data/monthly_activity.csv",d=>number(d,["post_count","month_number"])),
  d3.csv("data/monthly_engagement.csv",d=>number(d,["post_count","avg_reddit_score","median_reddit_score","total_reddit_score","month_number"])),
  d3.csv("data/monthly_sentiment.csv",d=>number(d,["total_posts","avg_sentiment","median_sentiment","negative_posts","neutral_posts","positive_posts","pct_negative","pct_neutral","pct_positive","month_number"])),
  d3.csv("data/tfidf_top_words.csv",d=>number(d,["rank","n","doc_freq","tf","idf","tf_idf"])),
  d3.csv("data/community_summary.csv",d=>number(d,["total_posts","avg_reddit_score","avg_sentiment","pct_negative"]))
]);drawActivity(activity);drawEngagement(engagement);drawSentiment(sentiment,summary);drawLanguage(terms)}
const links=[...document.querySelectorAll(".rail a")];const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){links.forEach(a=>a.classList.toggle("active",a.hash===`#${entry.target.id}`));entry.target.querySelectorAll(".reveal").forEach(el=>el.classList.add("shown"))}}),{rootMargin:"-35% 0px -48%"});document.querySelectorAll(".observed").forEach(section=>observer.observe(section));
init().catch(error=>document.querySelector("main").insertAdjacentHTML("beforeend",`<p class="load-error">The visualization data could not be loaded: ${error.message}</p>`));
