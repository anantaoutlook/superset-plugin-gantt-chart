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
import { styled, t } from "@superset-ui/core";
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
    font-size: 9px;
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
  const { data, width } = props;
  // console.log('data', data);
  let tempheight = props && (props.height * 35) / 100;
  // console.log("org", props.height);
  // console.log("temp", tempheight);

  const height = props.height - tempheight;
  // console.log("cal",height)
  // console.log('DATA', data);
  const rootElem = createRef<HTMLDivElement>();
  useEffect(() => {
    d3.select("#graphic").selectAll("svg").remove();
    createChart(rootElem);
  });

  let minNum = 0;
  let maxNum = 0;
  const createChart = (divEle: any) => {
    // const element = document.getElementById("graphic");
    const svg = d3
      .select("#graphic")
      .append("svg")
      .attr("width", width)
      .attr("height", height + 15)
      .attr("class", "svg");
    const filteredData = data; // .filter((d: any)=> d.starttime !== d.endtime );
    // console.log('filteredData', filteredData);
    const taskArray = filteredData.sort((a: any, b: any) => (b.from > a.from ? -1 : 1));
    // console.log("taskArray", taskArray);
    const min: any = d3.min(taskArray, (d: any) => d.starttime);
    const max: any = d3.max(taskArray, (d: any) => d.endtime);
    minNum = min;
    maxNum = max;
    const timeScale: any = d3
      .scaleLinear()
      .domain([min, max])
      .range([0, width - 260]); // horizontal rectangle last tick right padding

    let categories = new Array();
    for (let i = 0; i < taskArray.length; i++) {
      categories.push(taskArray[i].from);
    }
    const catsUnfiltered = categories; //for vert labels
    categories = checkUnique(categories);

    // X axis label
    svg
      .append("text")
      .text("Time since case started (minutes)")
      .attr("x", width / 2)
      .attr("y", height + 15)
      .attr("text-anchor", "middle")
      .attr("font-size", 9)
      // .attr("transform", "rotate(-65)")
      .attr("fill", "#000000");

    // axis label
    svg
      .append("text")
      .text("Assembly Step")
      .attr("x", 0)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", 9)
      .attr("transform", `rotate(-90-5 ${height / 2 - 15})`)
      .attr("fill", "#000000");

    makeGant(
      taskArray,
      width,
      height,
      categories,
      timeScale,
      svg,
      catsUnfiltered,
      filteredData
    );
  };

  const makeGant = (
    tasks: any,
    pageWidth: any,
    pageHeight: any,
    categories: any,
    timeScale: any,
    svg: any,
    catsUnfiltered: any,
    filteredData: any
  ) => {
    // console.log("makeGant");

    const barHeight = 25;
    const gap = barHeight + 6;
    const topPadding = 75;
    const sidePadding = 160; // grid left side padding of ticks rendering

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
      timeScale,
      filteredData
    );
    vertLabels(gap, topPadding, svg, filteredData);
  };
  const makeGrid = (
    theSidePad: any,
    theTopPad: any,
    w: any,
    h: any,
    timeScale: any,
    svg: any
  ) => {
    // console.log("makeGrid");
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

    // Y axis ticks height
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

    // const grid
    svg
      .append("g")
      .attr("class", "grid")
      .attr("transform", "translate(" + theSidePad + ", " + (h - 20) + ")")
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "middle")
      .attr("stroke", "#808080")
      .attr("stroke-width", "0.5px")
      .attr("font-size", 10)
      .attr("dy", "1em");
  };

  // Draw horizontal rectangles
  const eleWithIndex: any = [];
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
    timeScale: any,
    filteredData: any
  ) => {
    // console.log('drawRects');
    const rectArray = [...theArray.filter((dt: any) => dt.endtime !== null)];
    /* let row_count: any = 0;
    const count_rows = (rectArray: any) => {
      let prev = rectArray[0];
      let d: any;
      for (let i = 1; i < rectArray.length; i++) {
        d = rectArray[i];
        let res = overlapCheck(d, prev);
        res ? row_count++ : null;
        prev = d;
      }
    };
    console.log('groupedData', groupedData);
    count_rows(innerSortedArray);
    let grid_array: any = [];
    for (let i = 1; i < row_count; i++) {
      grid_array.push(1);
    } */

    const groupedData = groupData(rectArray);
    const uniqueCategories: any = Array.from(
      new Set(rectArray.map((d: any) => d.from))
    );
    const noOfRects: any = [];
    uniqueCategories.forEach((cat: any) => {
      const check = checkInline(cat, filteredData);
      let total = 0;
      total = check.single + 1;
      for (let index = 0; index < total; index++) {
        noOfRects.push(1);
      }
    });

    // draw x axis rectangles
    svg
      .append("g")
      .selectAll("rect")
      .filter((d: any) => d.endtime !== null)
      .data(noOfRects)
      .enter()
      .append("rect")
      .attr("x", 120)
      .attr("y", (d: any, i: any) => {
        return i * theGap + theTopPad - 2;
      })
      .attr("width", (d: any) => {
        return w - theSidePad / 2;
      })
      .attr("height", (d: any) => {
        return theGap;
      })
      .attr("stroke", "#808080")
      .attr("stroke-width", "0.5px")
      .attr("fill", "#fff")
      .attr("opacity", 0.2);

    const rectangles = svg
      .append("g")
      .selectAll("rect")
      .data(noOfRects)
      .enter();

    // inner reactangle drawer

    let prev: any;
    let prevY: number;
    let y: number = 0;
    let i: number = 0;
    let prevI: number = 0;
    // const newArray = [...theArray.filter((dt: any) => dt.endtime !== null)];
    let innerRects: any;
    const colors = ["#74c7e9", "#f17878", "#73dbd3", "#dbda73"];

    // sort records by starttime and append inner rectangles
    let innerSortedArray: Array<any> = [];
    groupedData.groups.forEach((element: any) => {
      const sort = element.childs.sort((a: any, b: any) =>
        b.starttime > a.starttime ? -1 : 1
      );
      innerSortedArray = [...innerSortedArray, ...sort];
    });
    // sorting end

    innerRects = rectangles
      .data([...innerSortedArray])
      .append("rect")
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("x", function (d: any) {
        return timeScale(d.starttime) + theSidePad;
      })
      .attr("y", function (d: any) {
        if (prev && d.from === prev.from && overlapCheck(d, prev)) {
          eleWithIndex.push({
            task: d,
            index: prevI,
          });
          y = prevY;
          return y;
        } else {
          y = i * theGap + theTopPad;
          eleWithIndex.push({
            task: d,
            index: i,
          });
          prev = d;
          prevY = y;
          prevI = i;
          i++;
          return y;
        }
      })
      .attr("width", function (d: any) {
        return timeScale(d.endtime) - timeScale(d.starttime);
      })
      .attr("height", theBarHeight)
      .attr("stroke", "none")
      .attr("fill", (d: any, index: number) => {
        const check = checkInline(d.from, filteredData);
        const ele = check.items.filter(
          (dt: any) =>
            dt.status === "single" &&
            d.starttime === dt.starttime &&
            d.endtime === dt.endtime &&
            d.from === dt.from
        )[0];
        if (ele) {
          return colors[check.items.indexOf(ele)];
        } else {
          return colors[0];
        }
      });

    // mouse over popup on inner rectangles
    innerRects
      .on("mouseover", (e: any, index: any, array: any) => {
        const eleIndex = eleWithIndex.filter((d: any) => d.task === e)[0].index;
        const tag = `From:  ${e.from} <br/> To:  ${e.to} <br/> Start Time:  ${e.starttime} <br/> End Time:  ${e.endtime}`;
        const output: any = document.getElementById("tag");
        const x =
          timeScale(e.starttime) +
          theSidePad +
          (timeScale(e.endtime) - timeScale(e.starttime)) / 2 -
          15 +
          "px";
        const y = eleIndex * theGap + theTopPad + 25 + "px";
        output.innerHTML = tag;
        output.style.top = y;
        output.style.left = x;
        output.style.fontSize = "9px";
        output.style.display = "block";
      })
      .on("mouseout", () => {
        const output: any = document.getElementById("tag");
        output.style.display = "none";
      });

    // inner rectangle text
    // console.log('rectangles', rectangles);
    prevY = 0;
    y = 0;
    let textIndex: any = 0;
    // const innerText =
    // inner text color
    const innerText = rectangles
      .append("text")
      .text((d: any) => {
        return ( d.to.length > 0 ) ? ((d.to.length > 20 && d.starttime !== d.endtime) ? d.to.substr(0, 15 ) + '...' : d.to) : '' ;
      })
      .attr("x", (d: any) => {
        return (
          (timeScale(d.endtime) - timeScale(d.starttime)) / 2 +
          timeScale(d.starttime) +
          theSidePad
        );
      })
      .attr("y", (d: any) => {
        if (prev && d.from === prev.from && overlapCheck(d, prev)) {
          y = prevY;
          return y + 15;
        } else {
          if (d.endtime == null) {
            return 0;
          }
          y = textIndex * theGap + theTopPad;
          prev = d;
          prevY = y;
          textIndex++;
          return y + 15;
        }
      })
      .attr("font-size", 9)
      .attr("text-anchor", "middle")
      .attr("text-height", theBarHeight)
      .attr("fill", "#000");

    innerText
      .on("mouseover", (e: any, index: any, array: any) => {
        const eleIndex = eleWithIndex.filter((d: any) => d.task === e)[0].index;
        const tag = `From:  ${e.from} <br/> To:  ${e.to} <br/> Start Time:  ${e.starttime} <br/> End Time:  ${e.endtime}`;
        const output: any = document.getElementById("tag");
        const x =
          timeScale(e.starttime) +
          theSidePad +
          (timeScale(e.endtime) - timeScale(e.starttime)) / 2 -
          15 +
          "px";
        const y = eleIndex * theGap + theTopPad + 25 + "px";
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
  const vertLabels = (theGap: any, theTopPad: any, svg: any, filteredData: any) => {
    let prev: any;
    let y: number = 0;
    // let y1: number = 0;
    let index: number = 0;
    const categories: any = [];
    // console.log('theGap, theTopPad, svg', theGap, theTopPad, svg);
    // draw left side labels
    const rowLabels = svg
      .append("g")
      .selectAll("text")
      .data(filteredData.filter((dt: any) => dt.endtime !== null))
      .enter()
      .append("text")
      .attr("id", (d: any, i: number) => "ltext" + i)
      .text((d: any, i: number) => d.to)
      .attr("x", 150)
      .attr("y", (d: any, i: any) => {
        if (prev && d.from === prev.from && overlapCheck(d, prev)) {
          return;
        } else {
          if (categories.indexOf(d.from) === -1) {
            y = index * theGap + theTopPad;
            prev = d;
            categories.push(d.from);
            const check = checkInline(d.from, filteredData);
            if (check.inline !== check.total) {
              index += check.total;
              return y + 15 * check.total - 5;
            } else {
              index += 1;
              return y + 15;
            }
          } else {
            return 0;
          }
        }
      })
      .attr("font-size", 9)
      .attr("width", '150px')
      .attr("class", "label-left")
      .attr("text-anchor", "end")
      .attr("text-height", 9);
      
      // devide left side lable in multiline
      rowLabels.each(function each(d: any, i: number) {
        const node = d3.select('#ltext'+i);
        const textFromNode = node.text();
        // console.log('textFromNode', textFromNode);
        const stringArray = stringToChanks(textFromNode, 25);
        const x: any = node.attr('x');
        const y: any = node.attr('y');
        const dy = parseFloat(node.attr('dy')) || 0;
        const lineHeight = 1.1; // ems
        node
          .text('')
          .append('tspan');
        stringArray.forEach((element, i) => {
          node
            .append('tspan')
            .attr('x', x)
            .attr('y', stringArray.length > 1 ? y - 7 : y)
            .attr('dy', i * lineHeight + dy + 'em')
            .text(stringArray[i]);  
        });
        
       });
  };

  function stringToChanks(str: string, chunkSize: number) {
    const chunks = [];
    while (str.length > 0) {
        chunks.push(str.substring(0, chunkSize));
        str = str.substring(chunkSize, str.length);
    }
    return chunks
}


  /*   function wrap(txt: any, data: any, xVal: number, yVal: number, index: number) {
    const width = data;
    const text =  d3.select('#ltext'+index);
    const words = text.text().split(/\s+/).reverse();
    let word;
    let line: any = [];
    let lineNumber = 0;
    const lineHeight = 1.1; // ems
    const x = xVal;
    const y = yVal;
    const dy = parseFloat(text.attr('dy')) || 0;
    let tspan: any = text
      .text('')
      .append('tspan')
      .attr('x', x)
      .attr('y', y)
      .attr('dy', dy + 'em');

    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(' '));
      const tspanWidth = tspan.node().getComputedTextLength() + 1;
      if ((tspanWidth + 10) > width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = text
          .append('tspan')
          .attr('x', x)
          .attr('y', y)
          .attr('dy', ++lineNumber * lineHeight + dy + 'em')
          .text(word);
      }
    }
  }; */

  const checkInline = (task: any, filteredData: any) => {
    const grouped: any = groupData(filteredData.filter((d: any) => d.endtime !== null));
    const filter = grouped.groups.filter((d: any) => d.task === task);
    if (filter.length > 0) {
      return {
        total: filter[0].childs.length,
        inline: filter[0].childs.filter((d: any) => d.status === "inline")
          .length,
        single: filter[0].childs.filter((d: any) => d.status === "single")
          .length,
        items: filter[0].childs,
        task: task,
      };
    } else {
      return {
        total: 0,
        inline: 0,
        items: filter,
      };
    }
  };

  const checkUnique = (arr: any) => {
    // console.log('checkUnique');
    const hash: any = {};
    const result: any = [];
    for (let i = 0, l = arr.length; i < l; ++i) {
      if (!hash.hasOwnProperty(arr[i])) {
        hash[arr[i]] = true;
        result.push(arr[i]);
      }
    }
    return result;
  };

  function overlapCheck(current: any, previous: any) {
    if (
      current.starttime < previous.endtime &&
      current.endtime > previous.starttime
    ) {
      return false;
    }
    return true;
  }
  const groupData = (tasks: any) => {
    const uniqueCategories: any = Array.from(
      new Set(tasks.map((d: any) => d.from))
    );
    const groupedData: any = [];
    uniqueCategories.forEach((element: any) => {
      const sortedEle = tasks
        .filter((d: any) => d.from === element)
        .sort((a: any, b: any) => (b.starttime > a.starttime ? -1 : 1));
      let prev: any;
      const children: any = [];
      sortedEle.forEach((d: any, index: number) => {
        if (prev && prev.from === d.from && overlapCheck(prev, d)) {
          children.push({ ...d, status: "inline" });
        } else {
          if (children.length === 0) {
            children.push({ ...d, status: "inline" });
          } else {
            children.push({ ...d, status: "single" });
          }
        }
        prev = d;
      });
      groupedData.push({
        task: element,
        childs: children,
      });
    });
    return { groups: groupedData, uniqueCategories: uniqueCategories };
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
