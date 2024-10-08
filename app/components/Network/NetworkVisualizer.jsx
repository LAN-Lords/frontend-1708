"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const NetworkGraph = ({
  nodesData,
  linksData,
  selectedNode,
  setSelectedNode,
  showAdjacency,
}) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({
    show: false,
    x: 0,
    y: 0,
    content: {},
  });

  useEffect(() => {
    const width = 885;
    const height = 575;

    // Check if the data is correct
    console.log("Nodes Data:", nodesData);
    console.log("Links Data:", linksData);

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
      
    svg.selectAll("*").remove();

    // Create a map for IP to Node ID
    const ipToNodeId = {};
    nodesData.forEach(node => {
      node.interfaces.forEach(iface => {
        ipToNodeId[iface.ip] = node.id;
      });
    });

    // Format linksData to use Node IDs
    const formattedLinks = linksData.map(link => ({
      source: ipToNodeId[link.source],
      target: ipToNodeId[link.target],
    }));

    // Verify the formatted links
    console.log("Formatted Links Data:", formattedLinks);

    const simulation = d3.forceSimulation(nodesData)
      .force("link", d3.forceLink(formattedLinks).id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-3000))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(20));

    const link = svg.append("g")
      .selectAll("line")
      .data(formattedLinks)
      .join("line")
      .attr("stroke-width", 2)
      .attr("stroke", "#aaa");

    const node = svg.append("g")
      .selectAll("image")
      .data(nodesData)
      .join("image")
      .attr("href", (d) => {
        switch (d.type) {
          case "router": return "/router.png";
          case "pc": return "/pc.png";
          case "server": return "/server.png";
          default: return "";
        }
      })
      .attr("width", 60)
      .attr("height", 60)
      .attr("x", (d) => d.x - 30)
      .attr("y", (d) => d.y - 30)
      .style("cursor", "pointer")
      .call(drag(simulation))
      .on("click", (event, d) => {
        if (showAdjacency) {
          setSelectedNode(d.id);
        }
      })
      .on("mouseover", (event, d) => {
        const [x, y] = d3.pointer(event);
        setTooltip({
          show: true,
          x: x + 20,
          y: y - 20,
          content: {
            id: d.id,
            name: d.name,
            type: d.type,
            interfaces: d.interfaces,
          },
        });
      })
      .on("mouseout", () => {
        setTooltip((prev) => ({ ...prev, show: false }));
      });

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("x", d => d.x - 30)
        .attr("y", d => d.y - 30);
    });

    if (showAdjacency && selectedNode !== null) {
      link
        .attr("stroke", d =>
          d.source.id === selectedNode || d.target.id === selectedNode
            ? "red"
            : "#aaa"
        )
        .attr("stroke-width", d =>
          d.source.id === selectedNode || d.target.id === selectedNode ? 2 : 1
        );

      node.attr("opacity", d =>
        d.id === selectedNode ||
        linksData.some(
          link =>
            (link.source === selectedNode && link.target === d.id) ||
            (link.target === selectedNode && link.source === d.id)
        )
          ? 1
          : 0.5
      );
    }

    return () => {
      svg.selectAll("*").remove();
    };
  }, [nodesData, linksData, selectedNode, showAdjacency]);

  const drag = (simulation) => {
    return d3.drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  };

  return (
    <div className="relative border-blue-500/20 border-2 rounded-xl bg-white">
      <svg ref={svgRef}></svg>
      {tooltip.show && (
        <div
          className="absolute bg-gray-800/70 text-white text-sm p-4 rounded shadow-lg"
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          <div>ID: {tooltip.content.id}</div>
          <div>Name: {tooltip.content.name}</div>
          <div>Type: {tooltip.content.type}</div>
          <div>
            Interfaces:
            {tooltip.content.interfaces &&
              tooltip.content.interfaces.length > 0 &&
              tooltip.content.interfaces.map((ifs, index) => (
                <div key={index} className="pl-4">
                  {ifs.name} : {ifs.ip}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkGraph;
