document.addEventListener("DOMContentLoaded", () => {
	// Fetch and display the datasets in the table on page load
	fetchDatasets();

	document
		.getElementById("add-dataset-btn")
		.addEventListener("click", addDataset);


	if (document.getElementById("btn1")) {
		document.getElementById("btn1").addEventListener("click", () =>
			showInputFields(1)
		);
		document.getElementById("btn2").addEventListener("click", () =>
			showInputFields(2)
		);
		document.getElementById("btn3").addEventListener("click", () =>
			showInputFields(3)
		);
	}
	if (document.getElementById("generateQueryBtn")) {
		document
			.getElementById("generateQueryBtn")
			.addEventListener("click", generateQuery);
	}
});

function addDataset() {
	const datasetIdInput = document.getElementById("dataset-id");
	const datasetKind = document.getElementById("kind").value;
	const fileInput = document.getElementById("dataset-file");
	const feedback = document.getElementById("feedback");

	const datasetId = datasetIdInput.value.trim();
	if (!datasetId) {
		feedback.textContent = "Please enter a dataset ID.";
		return;
	}
	if (fileInput.files.length === 0) {
		feedback.textContent = "Please select a dataset file (.zip).";
		return;
	}

	const file = fileInput.files[0];
	const reader = new FileReader();

	reader.onload = async function () {
		const content = reader.result; // File contents as ArrayBuffer

		try {
			// PUT request to add (or update) the dataset.
			const response = await fetch(`/dataset/${datasetId}/${datasetKind}`, {
				method: "PUT",
				body: content,
				headers: {
					"Content-Type": "application/x-zip-compressed",
				},
			});

			if (response.ok) {
				const result = await response.json();
				feedback.textContent = "Dataset added successfully!";
				fetchDatasets();
			} else {
				const errorData = await response.json();
				const errorMessage = errorData.error || "Error adding dataset.";
				feedback.textContent = errorMessage;
			}
		} catch (error) {
			console.error("Error adding dataset:", error);
			feedback.textContent =
				"Error adding dataset. See console for details.";
		}
	};

	reader.onerror = function () {
		feedback.textContent = "Error reading file.";
	};

	reader.readAsArrayBuffer(file);
}


async function fetchDatasets() {
	try {
		const response = await fetch("/datasets", { method: "GET" });
		if (response.ok) {
			const result = await response.json();
			updateDatasetTable(result.result);
		} else {
			console.error("Error fetching datasets.");
		}
	} catch (error) {
		console.error("Error fetching datasets:", error);
	}
}


function updateDatasetTable(datasets) {
	const tbody = document.querySelector("#datasetTable tbody");
	tbody.innerHTML = ""; // Clear existing rows

	datasets.forEach((dataset) => {
		const row = document.createElement("tr");

		const idCell = document.createElement("td");
		idCell.textContent = dataset.id;
		row.appendChild(idCell);

		const kindCell = document.createElement("td");
		kindCell.textContent = dataset.kind;  // Should be "sections" or "rooms"
		row.appendChild(kindCell);

		// const firstCell = document.createElement("td");
		// // Check if the dataset has a 'rows' property with at least one row.
		// if (dataset.rows && dataset.rows.length > 0) {
		// 	// Display the content of the first row. Adjust formatting as needed.
		// 	firstCell.textContent = JSON.stringify(dataset.rows[0]);
		// } else {
		// 	firstCell.textContent = "No data available";
		// }
		// row.appendChild(firstCell);


		const numRowsCell = document.createElement("td");
		numRowsCell.textContent = dataset.numRows; // Should be a number like 64612
		row.appendChild(numRowsCell);


		const buttonCell = document.createElement("td");
		const button = document.createElement("button");
		button.textContent = "Remove";

		// Add an event listener for the remove button
		button.addEventListener("click", (event) => {
			event.stopPropagation(); // Prevent the row click event from being triggered
			if (window.confirm(`Button clicked for dataset ID: ${dataset.id}. Do you want to proceed?`)) {
				deleteDataset(dataset.id);
			}
		});

		buttonCell.appendChild(button);

		row.appendChild(buttonCell);

		tbody.appendChild(row);
	});
}



async function deleteDataset(datasetId) {
	try {
		const response = await fetch(`/dataset/${datasetId}`, {
			method: "DELETE",
		});
		if (response.ok) {
			fetchDatasets();
		} else {
			console.error("Error deleting dataset " + datasetId);
		}
	} catch (error) {
		console.error("Error deleting dataset " + datasetId, error);
	}
}

// /**
//  * Updates an existing dataset by prompting the user to select a new file.
//  */
// function updateDataset(datasetId) {
// 	// Create a hidden file input element for the update
// 	const fileInput = document.createElement("input");
// 	fileInput.type = "file";
// 	fileInput.accept = ".zip";
// 	fileInput.style.display = "none";
// 	document.body.appendChild(fileInput);
//
// 	fileInput.addEventListener("change", function () {
// 		if (fileInput.files.length === 0) {
// 			alert("No file selected.");
// 			document.body.removeChild(fileInput);
// 			return;
// 		}
// 		const file = fileInput.files[0];
// 		const reader = new FileReader();
//
// 		reader.onload = async function () {
// 			const content = reader.result;
// 			try {
// 				const response = await fetch(`/dataset/${datasetId}/sections`, {
// 					method: "PUT",
// 					body: content,
// 					headers: {
// 						"Content-Type": "application/x-zip-compressed",
// 					},
// 				});
// 				if (response.ok) {
// 					const result = await response.json();
// 					alert("Dataset updated successfully!");
// 					fetchDatasets();
// 				} else {
// 					const errorData = await response.json();
// 					const errorMessage =
// 						errorData.error || "Error updating dataset.";
// 					alert(errorMessage);
// 				}
// 			} catch (error) {
// 				console.error("Error updating dataset:", error);
// 				alert("Error updating dataset. See console for details.");
// 			}
// 			document.body.removeChild(fileInput);
// 		};
//
// 		reader.onerror = function () {
// 			alert("Error reading file.");
// 			document.body.removeChild(fileInput);
// 		};
//
// 		reader.readAsArrayBuffer(file);
// 	});
//
// 	fileInput.click(); // Open file selection dialog
// }



function showInputFields(queryNum) {
	const inputs = document.querySelectorAll(".input-fields");
	inputs.forEach((input) => (input.style.display = "none"));
	const selected = document.getElementById(`input-${queryNum}`);
	if (selected) {
		selected.style.display = "block";
	}
}

async function generateQuery() {
	let queryObject;
	if (document.getElementById("input-1").style.display === "block") {
		queryObject = generateA();
	} else if (document.getElementById("input-2") && document.getElementById("input-2").style.display !== "none") {
		queryObject = generateB();
	} else if (document.getElementById("input-3") && document.getElementById("input-3").style.display !== "none") {
		queryObject = generateC();
	} else {
		alert("Please select a query type.");
		return;
	}
	try {
		const response = await fetch("/query", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(queryObject),
		});
		const data = await response.json();
		console.log(data);
		if (response.ok && data) {
			renderQueryResults(data.result);
		} else {
			let errMsg = data.error;
			if (errMsg && errMsg.includes("Too many results")) {
				errMsg = "There are too many results (+5000)";
			}
			alert("Query error: " + errMsg);
		}
	} catch (error) {
		console.error("Error generating query:", error);
		alert("Query error: Other");
	}
}


// function generateA() {
// 	const id = document.getElementById("field1-1").value.trim();
// 	return {
// 	  WHERE: {},
// 	  OPTIONS: {
// 		COLUMNS: [id + "_year", "overallAvg"],
// 		ORDER: id + "_year"
// 	  },
// 	  TRANSFORMATIONS: {
// 		GROUP: [id + "_year"],
// 		APPLY: [{ overallAvg: { AVG: id + "_avg" } }]
// 	  }
// 	};
//   }
//
//   function generateB() {
// 	const datasetKey = document.getElementById("field1-2").value.trim();
// 	return {
// 	  WHERE: {},
// 	  OPTIONS: {
// 		COLUMNS: [datasetKey + "_dept", "passSum", "failSum", "auditSum"],
// 		ORDER: datasetKey + "_dept"
// 	  },
// 	  TRANSFORMATIONS: {
// 		GROUP: [datasetKey + "_dept"],
// 		APPLY: [
// 		  { passSum: { SUM: datasetKey + "_pass" } },
// 		  { failSum: { SUM: datasetKey + "_fail" } },
// 			{ auditSum: { SUM: datasetKey + "_audit" } }
// 		]
// 	  }
// 	};
//   }
//
//   function generateC() {
// 	  const datasetKey = document.getElementById("field1-3").value.trim();
// 	  return {
// 		  WHERE: {},
// 		  OPTIONS: {
// 			  COLUMNS: [datasetKey + "_instructor", "instructorAvg"],
// 			  ORDER: {dir: "DOWN", keys: ["instructorAvg"]}
// 		  },
// 		  TRANSFORMATIONS: {
// 			  GROUP: [datasetKey + "_instructor"],
// 			  APPLY: [{instructorAvg: {AVG: datasetKey + "_avg"}}]
// 		  }
// 	  }
//   }

function generateA() {
	const datasetId = document.getElementById("field1-1").value.trim();
	return {
		WHERE: {},
		OPTIONS: {
			COLUMNS: [`${datasetId}_year`, "overallAvg"],
			ORDER: `${datasetId}_year`
		},
		TRANSFORMATIONS: {
			GROUP: [`${datasetId}_year`],
			APPLY: [{ overallAvg: { AVG: `${datasetId}_avg` } }]
		}
	};
}

function generateB() {
	const datasetId = document.getElementById("field1-2").value.trim();
	return {
		WHERE: {},
		OPTIONS: {
			COLUMNS: [`${datasetId}_dept`, "passSum", "failSum", "auditSum"],
			ORDER: `${datasetId}_dept`
		},
		TRANSFORMATIONS: {
			GROUP: [`${datasetId}_dept`],
			APPLY: [
				{ passSum: { SUM: `${datasetId}_pass` } },
				{ failSum: { SUM: `${datasetId}_fail` } },
				{ auditSum: { SUM: `${datasetId}_audit` } }
			]
		}
	};
}

function generateC() {
	const datasetId = document.getElementById("field1-3").value.trim();
	return {
		WHERE: {},
		OPTIONS: {
			COLUMNS: [`${datasetId}_instructor`, "instructorAvg"],
			ORDER: {dir: "DOWN", keys: ["instructorAvg"]}
		},
		TRANSFORMATIONS: {
			GROUP: [`${datasetId}_instructor`],
			APPLY: [{instructorAvg: {AVG: `${datasetId}_avg`}}]
		}
	};
}


	  /**
	   * Determines which chart to render based on the active query input fields.
	   */
	  function renderQueryResults(results) {
		  hideAllCharts();
		  if (
			  document.getElementById("input-1") &&
			  document.getElementById("input-1").style.display !== "none"
		  ) {
			  renderAvgScoreChart(results);
		  } else if (
			  document.getElementById("input-2") &&
			  document.getElementById("input-2").style.display !== "none"
		  ) {
			  renderPassFailChart(results);
		  } else if (
			  document.getElementById("input-3") &&
			  document.getElementById("input-3").style.display !== "none"
		  ) {
			  renderInstructorRankingChart(results);
		  }
	  }

	  let currentChart = null;

	  /**
	   * Renders a line chart for Trend Analysis of Average Course Grades.
	   * Expects each data item to have keys: "sections_year" and "overallAvg".
	   */
	  function renderAvgScoreChart(data) {
		  const canvas = document.getElementById("avgScoreChart");
		  if (!canvas) return;
		  canvas.style.display = "block";
		  const ctx = canvas.getContext("2d");

		  // Get the dataset ID from the input field
		  const datasetId = document.getElementById("field1-1").value.trim();

		  if (currentChart) {
			  currentChart.destroy();
		  }

		  // Extract years and average grade values using dynamic dataset ID
		  const labels = data.map(item => item[`${datasetId}_year`]);
		  const averages = data.map(item => item["overallAvg"]);

		  currentChart = new Chart(ctx, {
			  type: "line",
			  data: {
				  labels: labels,
				  datasets: [{
					  label: "Average Course Grade Over the Years",
					  data: averages,
					  borderColor: "rgba(75, 192, 192, 1)",
					  backgroundColor: "rgba(75, 192, 192, 0.2)",
					  borderWidth: 2,
					  fill: false,
					  tension: 0.1,
				  }],
			  },
			  options: {
				  responsive: true,
				  plugins: {
					  legend: {
						  display: true,
						  position: 'top',
					  },
					  tooltip: {
						  callbacks: {
							  label: function(context) {
								  return `Average: ${context.parsed.y.toFixed(2)}`;
							  }
						  }
					  }
				  },
				  scales: {
					  y: {
						  beginAtZero: false,
						  title: {
							  display: true,
							  text: 'Average Grade'
						  }
					  },
					  x: {
						  title: {
							  display: true,
							  text: 'Year'
						  }
					  }
				  }
			  }
		  });
	  }

	  /**
	   * Renders a bar chart for Department Pass/Fail Breakdown.
	   * Expects each data item to have keys: "sections_dept", "passSum", and "failSum".
	   */
	  function renderPassFailChart(data) {
		  const canvas = document.getElementById("passFailAuditChart");
		  if (!canvas) return;
		  canvas.style.display = "block";
		  const ctx = canvas.getContext("2d");

		  // Get the dataset ID from the input field
		  const datasetId = document.getElementById("field1-2").value.trim();

		  if (currentChart) {
			  currentChart.destroy();
		  }

		  // Extract data using dynamic dataset ID
		  const labels = data.map(item => item[`${datasetId}_dept`]);
		  const passData = data.map(item => item["passSum"]);
		  const failData = data.map(item => item["failSum"]);
		  const auditData = data.map(item => item["auditSum"] || 0); // Optional: include audit data

		  currentChart = new Chart(ctx, {
			  type: "bar",
			  data: {
				  labels: labels,
				  datasets: [
					  {
						  label: "Pass Count",
						  data: passData,
						  backgroundColor: "rgba(75, 192, 192, 0.7)",
						  borderColor: "rgba(75, 192, 192, 1)",
						  borderWidth: 1
					  },
					  {
						  label: "Fail Count",
						  data: failData,
						  backgroundColor: "rgba(255, 99, 132, 0.7)",
						  borderColor: "rgba(255, 99, 132, 1)",
						  borderWidth: 1
					  },
					  // Optional: Add audit data if available
					  {
						  label: "Audit Count",
						  data: auditData,
						  backgroundColor: "rgba(153, 102, 255, 0.7)",
						  borderColor: "rgba(153, 102, 255, 1)",
						  borderWidth: 1
					  }
				  ]
			  },
			  options: {
				  responsive: true,
				  plugins: {
					  legend: {
						  position: 'top',
					  },
					  tooltip: {
						  callbacks: {
							  label: function(context) {
								  return `${context.dataset.label}: ${context.parsed.y}`;
							  }
						  }
					  }
				  },
				  scales: {
					  y: {
						  beginAtZero: true,
						  stacked: false,
						  title: {
							  display: true,
							  text: 'Number of Students'
						  }
					  },
					  x: {
						  title: {
							  display: true,
							  text: 'Department'
						  },
						  grid: {
							  display: false
						  }
					  }
				  },
				  animation: {
					  duration: 1000
				  }
			  }
		  });
	  }

	  /**
	   * Renders a bar chart for Ranking Instructors by Average Grade.
	   * Expects each data item to have keys: "sections_instructor" and "instructorAvg".
	   */
	  function renderInstructorRankingChart(data) {
		const canvas = document.getElementById("topInstructorChart");
		if (!canvas) return;
		canvas.style.display = "block";
		const ctx = canvas.getContext("2d");
		if (currentChart) {
			currentChart.destroy();
			currentChart = null;
		}
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const datasetId = document.getElementById("field1-3").value.trim();
		const labels = data.map(item => item[`${datasetId}_instructor`]);
		const instructorAvgs = data.map(item => item["instructorAvg"]);
		currentChart = new Chart(ctx, {
			type: "bar",
			data: {
				labels: labels,
				datasets: [{
					label: "Average Grade by Instructor",
					data: instructorAvgs,
					backgroundColor: "rgba(75, 192, 192, 0.7)",
					borderColor: "rgba(75, 192, 192, 1)",
					borderWidth: 1,
					borderRadius: 4
				}]
			},
			options: {
				responsive: true,
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (context) => `Average: ${context.parsed.y.toFixed(2)}%`
						}
					},
					title: {
						display: true,
						text: 'Instructor Performance by Average Grade',
						font: { size: 16 }
					}
				},
				scales: {
					x: {
						title: { display: true, text: 'Instructor' },
						ticks: { autoSkip: false },
						grid: { display: false }
					},
					y: {
						beginAtZero: true,
						title: { display: true, text: 'Average Grade (%)' }
					}
				},
				animation: { duration: 1500 },
				maintainAspectRatio: true
			}
		});
	}

	  /**
	   * Hides all chart canvases.
	   */
	  function hideAllCharts() {
		  const chartIds = [
			  "avgScoreChart",
			  "passFailAuditChart",
			  "courseDistributionChart",
		  ];
		  chartIds.forEach((id) => {
			  const canvas = document.getElementById(id);
			  if (canvas) {
				  canvas.style.display = "none";
			  }
		  });
	  }

