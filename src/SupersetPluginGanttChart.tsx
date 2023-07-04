/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useEffect, createRef } from "react";
import { styled } from "@superset-ui/core";
import {
  SupersetPluginGanttChartProps,
  SupersetPluginGanttChartStylesProps,
} from "./types";
import * as d3 from "d3";

// import * as d3Scale from "d3-scale";

// The following Styles component is a <div> element, which has been styled using Emotion
// For docs, visit https://emotion.sh/docs/styled

// Theming variables are provided for your use via a ThemeProvider
// imported from @superset-ui/core. For variables available, please visit
// https://github.com/apache-superset/superset-ui/blob/master/packages/superset-ui-core/src/style/index.ts

const Styles = styled.div<SupersetPluginGanttChartStylesProps>`
  // grid color
  .grid .tick {
    stroke: lightgrey;
    opacity: 0.5;
    shape-rendering: crispEdges;
  }
  .grid path {
    stroke-width: 0;
  }

  #tag {
    color: #000;
    background: #fff;
    width: 180px;
    position: absolute;
    display: none;
    padding: 3px 10px;
    margin-left: -80px;
    font-size: 11px;
    box-shadow: 0px 0px 5px #808080;
  }

  #tag:before {
    border: solid transparent;
    content: " ";
    height: 0;
    left: 50%;
    margin-left: -5px;
    position: absolute;
    width: 0;
    border-width: 10px;
    border-bottom-color: #fff;
    top: -20px;
  }
`;

/**
 * ******************* WHAT YOU CAN BUILD HERE *******************
 *  In essence, a chart is given a few key ingredients to work with:
 *  * Data: provided via `props.data`
 *  * A DOM element
 *  * FormData (your controls!) provided as props by transformProps.ts
 */

export default function SupersetPluginGanttChart(
  props: SupersetPluginGanttChartProps
) {
  // height and width are the height and width of the DOM element as it exists in the dashboard.
  // There is also a `data` prop, which is, of course, your DATA 🎉
  const { data, height, width } = props;
  // console.log('DATA', data);
  const rootElem = createRef<HTMLDivElement>();
  useEffect(() => {
    d3.select("#graphic").selectAll("svg").remove();
    createChart();
  });

  let minNum = 0;
  let maxNum = 0;
  const createChart = () => {
    const element = document.getElementById("graphic");
    const svg = d3
      .select(element)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "svg");

    const taskArray = data.sort((a: any, b: any) => (b.task > a.task ? -1 : 1));
    console.log("taskArray", taskArray);
    const min: any = d3.min(taskArray, (d: any) => d.startTime);
    const max: any = d3.max(taskArray, (d: any) => d.endTime);
    minNum = min;
    maxNum = max;
    const timeScale: any = d3
      .scaleLinear()
      .domain([min, max])
      .range([0, width - 150]);

    let categories = new Array();
    for (let i = 0; i < taskArray.length; i++) {
      categories.push(taskArray[i].type);
    }
    const catsUnfiltered = categories; //for vert labels
    categories = checkUnique(categories);

    // X axis label
    svg
      .append("text")
      .text("Time since case started (minutes)")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      // .attr("transform", "rotate(-65)")
      .attr("fill", "#000000");

    // axis label
    svg
      .append("text")
      .text("Assembly Step")
      .attr("x", 0)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("transform", `rotate(-90-5 ${height / 2 - 15})`)
      .attr("fill", "#000000");

    makeGant(
      taskArray,
      width,
      height,
      categories,
      timeScale,
      svg,
      catsUnfiltered
    );
  };

  const makeGant = (
    tasks: any,
    pageWidth: any,
    pageHeight: any,
    categories: any,
    timeScale: any,
    svg: any,
    catsUnfiltered: any
  ) => {
    console.log("makeGant");

    const barHeight = 20;
    const gap = barHeight + 4;
    const topPadding = 75;
    const sidePadding = 75;

    const colorScale = d3.scaleLinear().domain([0, categories.length]);

    makeGrid(sidePadding, topPadding, pageWidth, pageHeight, timeScale, svg);
    drawRects(
      tasks,
      gap,
      topPadding,
      sidePadding,
      barHeight,
      colorScale,
      pageWidth,
      pageHeight,
      svg,
      categories,
      timeScale
    );
    vertLabels(
      gap,
      topPadding,
      sidePadding,
      barHeight,
      colorScale,
      svg,
      categories,
      catsUnfiltered
    );
  };
  const makeGrid = (
    theSidePad: any,
    theTopPad: any,
    w: any,
    h: any,
    timeScale: any,
    svg: any
  ) => {
    console.log("makeGrid");
    // verticle ticks
    const total = minNum + maxNum;
    let ticks = 1;
    if (total > 0 && total < 25) {
      ticks = 1;
    } else if (total > 25 && total < 50) {
      ticks = 2;
    } else if (total > 50 && total < 90) {
      ticks = 4;
    }
    if (total > 90 && total < 120) {
      ticks = 5;
    } else {
      ticks = 10;
    }

    // console.log('-h + theTopPad + 20',-h ,theTopPad,  -h + theTopPad + 20 );
    const xAxis = d3
      .axisBottom(timeScale)
      // .scale(timeScale)
      .ticks(ticks)
      .tickSize(-h + theTopPad + 20)
      .tickFormat((d: any, i: number) => {
        if (i % 2 === 0) {
          return d;
        } else {
          return "";
        }
      });
    // .tickSizeOuter(0)
    /* .tickFormat((d: any, i: number) => {
	  /* .tickFormat((d: any, i: number) => {
        if (i % 2 === 0) {
          return d3.timeFormat('%H:%M')(d);
        } else {
          return '';
        }
      }); */

    // const grid
    svg
      .append("g")
      .attr("class", "grid")
      .attr("transform", "translate(" + theSidePad + ", " + (h - 50) + ")")
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "middle")
      // .attr("fill", "grey")
      .attr("stroke", "none")
      .attr("font-size", 10)
      .attr("dy", "1em");
  };

  // Draw horizontal rectangles
  const drawRects = (
    theArray: any,
    theGap: any,
    theTopPad: any,
    theSidePad: any,
    theBarHeight: any,
    theColorScale: any,
    w: any,
    h: any,
    svg: any,
    categories: any,
    timeScale: any
  ) => {
    // console.log('drawRects');

    // horizontal grid lines background
    // theArray.splice(1,1);
    /* const rectArray = [...theArray]
    rectArray.splice(1,1);
    console.log('rectArray', rectArray); */
    svg
      .append("g")
      .selectAll("rect")
      .data(theArray)
      .enter()
      .append("rect")
      .attr("x", 40)
      .attr("y", (d: any, i: any) => {
        return i * theGap + theTopPad - 2;
      })
      .attr("width", (d: any) => {
        return w - theSidePad / 2;
      })
      .attr("height", theGap)
      .attr("stroke", "#808080")
      .attr("stroke-width", "0.5px")
      .attr("fill", (d: any) => {
        for (let i = 0; i < categories.length; i++) {
          if (d.type == categories[i]) {
            return "#fff";
          }
        }
        return "";
      })
      .attr("opacity", 0.2);

    /* let preElement: any;
    theArray.forEach((element: any, rectIndex: number) => {
      if (preElement && element.task === preElement.task) {
        preElement = undefined;
        return;
      } else {
        svg
        .append("g")
        .selectAll("rect")
        .append("rect")
        .attr("x", 40)
        .attr("y", (d: any, i: any) => {
          return rectIndex * theGap + theTopPad - 2;
        })
        .attr("width", (d: any) => {
          return w - theSidePad / 2;
        })
        .attr("height", theGap)
        .attr("stroke", "#808080")
        .attr("stroke-width", "0.5px")
        .attr("fill", (d: any) => {
          for (let i = 0; i < categories.length; i++) {
            if (d.type == categories[i]) {
              return "#fff";
            }
          }
          return "";
        })
        .attr("opacity", 0.2);
        preElement = element;
      }
    }); */

    const rectangles = svg.append("g").selectAll("rect").data(theArray).enter();

    // inner reactangle drawer
    // console.log("rectangles", rectangles);

    let prev: any;
    let prevY: number;
    let x: number = 0;
    let y: number = 0;
    // let flag: number = 0;
    let width: number = 0;
    let i: number = 0;
    const newArray = [...theArray];
    let innerRects: any;

    innerRects = rectangles
      .data(newArray)
      .append("rect")
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("x", function (d: any) {
        x = timeScale(d.startTime) + theSidePad;
        return x;
      })
      .attr("y", function (d: any) {
        if (prev && d.details === prev.details) {
          y = prevY;
          return y;
        } else {
          y = i * theGap + theTopPad;
          prev = d;
          prevY = y;
          i++;
          return y;
        }
      })
      .attr("width", function (d: any) {
        width = timeScale(d.endTime) - timeScale(d.startTime);
        return width;
      })
      .attr("height", theBarHeight)
      .attr("stroke", "none")
      .attr("fill", "#A6CEE3");

    // console.log(innerRects);

    // mouse over popup on inner rectangles
    innerRects
      .on("mouseover", (e: any, index: any, array: any) => {
        let tag = "";
        if (e.details != undefined) {
          tag = `Task:  ${e.task} <br/> Type:  ${e.type} <br/> Starts:  ${e.startTime} <br/> Ends:  ${e.endTime} <br/> Details:  ${e.details}`;
        } else {
          tag = `Task: ${e.task} <br/> Type: ${e.type} <br/> Starts:  ${e.startTime} <br/> Ends:  ${e.endTime}`;
        }
        const output: any = document.getElementById("tag");
        const x =
          timeScale(e.startTime) +
          theSidePad +
          (timeScale(e.endTime) - timeScale(e.startTime)) / 2 +
          "px";
        const y = index * theGap + theTopPad + 25 + "px";
        output.innerHTML = tag;
        output.style.top = y;
        output.style.left = x;
        output.style.display = "block";
      })
      .on("mouseout", () => {
        const output: any = document.getElementById("tag");
        output.style.display = "none";
      });
  };

  // X Axis label
  const vertLabels = (
    theGap: any,
    theTopPad: any,
    theSidePad: any,
    theBarHeight: any,
    theColorScale: any,
    svg: any,
    categories: any,
    catsUnfiltered: any
  ) => {
    // console.log('vertLabels');
    const numOccurances = new Array();
    let prevGap = 0;

    for (let i = 0; i < categories.length; i++) {
      numOccurances[i] = [
        categories[i],
        getCount(categories[i], catsUnfiltered),
      ];
    }
    //console.log(numOccurances);
    // const Y axisText =
    svg
      .append("g") //without doing this, impossible to put grid lines behind text
      .selectAll("text")
      .data(numOccurances)
      .enter()
      .append("text")
      .text((d: any) => {
        return d[0];
      })
      .attr("x", 35)
      .attr("y", (d: any, i: any) => {
        if (i > 0) {
          for (let j = 0; j < i; j++) {
            prevGap += numOccurances[i - 1][1];
            return prevGap * theGap + theTopPad - 10;
          }
        } else {
          return (d[1] * theGap) / 3.5 + theTopPad;
        }
        return "";
      })
      .attr("font-size", 11)
      .attr("text-anchor", "end")
      .attr("text-height", 14);
    // Y Axis label fill color
    // .attr("fill", (d: any) => {
    //     for (let i = 0; i < categories.length; i++) {
    //       if (d[0] == categories[i]) {
    //         return d3.rgb(theColorScale(i)).darker();
    //       }
    //     }
    //     return "";
    //   });
  };

  const checkUnique = (arr: any) => {
    // console.log('checkUnique');
    const hash: any = {};
    const result: any = [];
    for (let i = 0, l = arr.length; i < l; ++i) {
      if (!hash.hasOwnProperty(arr[i])) {
        //it works with objects! in FF, at least
        hash[arr[i]] = true;
        result.push(arr[i]);
      }
    }
    return result;
  };

  const getCounts = (arr: any) => {
    // console.log('getCounts');
    let i = arr.length; // var to loop over
    const obj: any = {}; // obj to store results
    while (i) obj[arr[--i]] = (obj[arr[i]] || 0) + 1; // count occurrences
    return obj;
  };

  const getCount = (word: any, arr: any) => {
    // console.log('getCount');
    return getCounts(arr)[word] || 0;
  };

  return (
    <Styles
      ref={rootElem}
      boldText={props.boldText}
      headerFontSize={props.headerFontSize}
      height={height}
      width={width}
    >
      <div id="graphic"></div>
      <div id="tag"></div>
    </Styles>
  );
}
