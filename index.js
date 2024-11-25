let editingIndex = null;
const recordsPerPage = 10; // 每頁顯示的記錄數量
let currentPage = 1; // 當前頁碼
const categoriesPerPage = 5; // 每頁顯示的分類數量
let currentCategoryPage = 1; // 當前分類頁碼

// 日期過濾器元素
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");

document.addEventListener("DOMContentLoaded", () => {
    const recordForm = document.getElementById("record-form");
    const categoryForm = document.getElementById("category-form");
    const recordList = document.getElementById("record-list");
    const categorySelect = document.getElementById("category");
    const categoryList = document.getElementById("category-list");
    const categoryChart = document.getElementById("category-chart");
    const monthFilter = document.getElementById("month-filter");
    const typeFilter = document.getElementById("type-filter");

    let records = JSON.parse(localStorage.getItem("records")) || [];
    let categories = JSON.parse(localStorage.getItem("categories")) || ["飲食", "交通", "娛樂", "其他"];
    let chartInstance = null; // 保存 Chart.js 實例

    // 填充月分篩選選項
    const populateMonthFilter = () => {
        const months = new Set(
            records.map(record => record.date.substring(0, 7)) // 提取年月
        );
        monthFilter.innerHTML = `<option value="all" selected>全部月份</option>`;
        months.forEach(month => {
            const option = document.createElement("option");
            option.value = month;
            option.textContent = month;
            monthFilter.appendChild(option);
        });
    };

    // 渲染分類列表
    const renderCategoryList = () => {
        categoryList.innerHTML = ""; // 清空分類列表

        categories.forEach((category, index) => {
            const li = document.createElement("li");
            li.className = "list-group-item d-flex justify-content-between align-items-center";
            li.textContent = category;
            li.setAttribute("draggable", "true"); // 設置項目可拖曳

            // 拖曳開始
            li.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("text/plain", index); // 保存被拖曳项目的索引
                li.classList.add("dragging"); // 添加透明效果

                // 初始化占位符
                const placeholder = document.createElement("li");
                placeholder.className = "placeholder list-group-item";
                placeholder.style.height = `${li.offsetHeight}px`;
                li.parentNode.insertBefore(placeholder, li.nextSibling);
            });

            // 拖曳過程允许放置
            li.addEventListener("dragover", (e) => {
                e.preventDefault(); // 阻止默認行为，允許放置
                const placeholder = document.querySelector(".placeholder");

                // 取得目标项的边界
                const bounding = li.getBoundingClientRect();
                const mouseY = e.clientY; // 鼠標的 Y 轴位置

                // 根据鼠標位置動態调整占位符位置
                if (mouseY > bounding.top + bounding.height / 2) {
                    // 鼠标在項目的下半部分
                    if (placeholder.nextSibling !== li.nextSibling) {
                        li.parentNode.insertBefore(placeholder, li.nextSibling);
                    }
                } else {
                    // 鼠标在項目的上半部分
                    if (placeholder !== li.previousSibling) {
                        li.parentNode.insertBefore(placeholder, li);
                    }
                }
            });

            // 拖曳结束
            li.addEventListener("dragend", () => {
                li.classList.remove("dragging"); // 移除透明效果
                const placeholder = document.querySelector(".placeholder");
                if (placeholder) placeholder.remove(); // 移除占位符
            });

            // 放置
            li.addEventListener("drop", (e) => {
                e.preventDefault();
                const draggedIndex = parseInt(e.dataTransfer.getData("text/plain"), 10); // 取得被拖曳的索引
                const placeholder = document.querySelector(".placeholder"); // 取得占位符
                const targetIndex = Array.from(categoryList.children).indexOf(placeholder); // 取得占位符索引

                if (draggedIndex !== targetIndex) {
                    const [draggedItem] = categories.splice(draggedIndex, 1); // 移除被拖曳的项目
                    categories.splice(targetIndex, 0, draggedItem); // 插入到目标位置
                    localStorage.setItem("categories", JSON.stringify(categories)); // 更新到 LocalStorage
                    renderCategoryList(); // 重新渲染列表
                    updateCategoryOptions(); // 更新下拉選單
                }
            });

            // 刪除按钮
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "btn btn-sm btn-danger";
            deleteBtn.textContent = "刪除";
            deleteBtn.onclick = () => {
                categories.splice(index, 1); // 刪除分類项目
                localStorage.setItem("categories", JSON.stringify(categories)); // 更新到 LocalStorage
                renderCategoryList();
                updateCategoryOptions(); // 更新下拉選單
            };

            li.appendChild(deleteBtn);
            categoryList.appendChild(li);
        });

        // 同步更新新增記帳下拉選單
        updateCategoryOptions();
    };

    // 更新新增記帳的下拉選單
    const updateCategoryOptions = () => {
        categorySelect.innerHTML = ""; // 清空下拉選單
        categories.forEach((category) => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    };

    // 新增分類功能
    categoryForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const newCategory = document.getElementById("new-category").value.trim(); // 取得輸入值

        // 检查是否为空或已存在
        if (newCategory && !categories.includes(newCategory)) {
            categories.push(newCategory); // 添加新分類
            localStorage.setItem("categories", JSON.stringify(categories)); // 保存到 LocalStorage
            updateCategoryOptions(); // 更新分類選單
            renderCategoryList(); // 重新渲染分類列表
        }
        categoryForm.reset(); // 清空輸入框
    });

    // 處理表單提交（新增或完成编辑）
    recordForm.addEventListener("submit", (e) => {
        e.preventDefault();

        // 獲取表單數據
        const type = document.querySelector('input[name="type"]:checked').value;
        const date = document.getElementById("date").value;
        const category = document.getElementById("category").value;
        const amount = parseFloat(document.getElementById("amount").value);
        const note = document.getElementById("note").value;

        if (!date || !category || isNaN(amount)) {
            alert("请填写完整的記帳信息！");
            return;
        }

        if (editingIndex !== null) {
            // 完成編輯
            records[editingIndex] = { type, date, category, amount, note }; // 更新紀錄
            editingIndex = null; // 清除編輯索引
        } else {
            // 新增紀錄
            records.push({ type, date, category, amount, note });
        }

        // 保存到 LocalStorage
        localStorage.setItem("records", JSON.stringify(records));

        recordForm.reset();
        const submitButton = recordForm.querySelector('button[type="submit"]');
        submitButton.textContent = "新增";

        const cancelButton = recordForm.querySelector('.cancel-edit-btn');
        if (cancelButton) cancelButton.remove();

        // 更新列表和圖表
        updateRecordList();
        renderChart();
    });

    // 編輯記帳
    const editRecord = (index) => {
        const record = records[index];
        editingIndex = index; // 設置當前編輯的索引

        // 填充表單數據
        document.getElementById("date").value = record.date;
        categorySelect.value = record.category;
        document.getElementById("amount").value = record.amount;
        document.getElementById("note").value = record.note;
        document.querySelector(`input[value="${record.type}"]`).checked = true;

        // 動態修改表單按鈕
        const submitButton = recordForm.querySelector('button[type="submit"]');
        submitButton.textContent = "完成编辑"; // 改為“完成編輯”

        // 添加“取消編輯”按钮
        let cancelButton = recordForm.querySelector('.cancel-edit-btn');
        if (!cancelButton) {
            cancelButton = document.createElement("button");
            cancelButton.type = "button";
            cancelButton.className = "btn btn-secondary cancel-edit-btn ms-2";
            cancelButton.textContent = "取消编辑";
            recordForm.appendChild(cancelButton);

            // 绑定取消編輯功能
            cancelButton.addEventListener("click", cancelEdit);
        }
    };

    // 取消編輯
    const cancelEdit = () => {
        editingIndex = null; // 清除編輯索引
        recordForm.reset(); // 重置表單

        // 恢復表單按鈕為默認
        const submitButton = recordForm.querySelector('button[type="submit"]');
        submitButton.textContent = "新增";

        // 移除"取消编編輯"按钮
        const cancelButton = recordForm.querySelector('.cancel-edit-btn');
        if (cancelButton) cancelButton.remove();
    };

    // 渲染分頁按鈕
    const renderPagination = () => {
        const pagination = document.getElementById("pagination");
        pagination.innerHTML = ""; // 清空分頁按鈕

        const totalPages = Math.ceil(records.length / recordsPerPage);

        // 添加「上一頁」按鈕
        const prevItem = document.createElement("li");
        prevItem.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;
        prevItem.innerHTML = `<a class="page-link" href="#">上一頁</a>`;
        prevItem.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                updateRecordList();
                renderPagination();
            }
        });
        pagination.appendChild(prevItem);

        // 添加頁碼按鈕
        for (let i = 1; i <= totalPages; i++) {
            const pageItem = document.createElement("li");
            pageItem.className = `page-item ${i === currentPage ? "active" : ""}`;
            pageItem.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            pageItem.addEventListener("click", () => {
                currentPage = i;
                updateRecordList();
                renderPagination();
            });
            pagination.appendChild(pageItem);
        }

        // 添加「下一頁」按鈕
        const nextItem = document.createElement("li");
        nextItem.className = `page-item ${currentPage === totalPages ? "disabled" : ""}`;
        nextItem.innerHTML = `<a class="page-link" href="#">下一頁</a>`;
        nextItem.addEventListener("click", () => {
            if (currentPage < totalPages) {
                currentPage++;
                updateRecordList();
                renderPagination();
            }
        });
        pagination.appendChild(nextItem);
    };

    // 渲染圖表
    const renderChart = () => {
        const selectedMonth = monthFilter.value;
        const selectedType = typeFilter.value;

        // 篩選數據
        const filteredRecords = records.filter(record => {
            const isMonthMatch = selectedMonth === "all" || record.date.startsWith(selectedMonth);
            const isTypeMatch = record.type === selectedType;
            return isMonthMatch && isTypeMatch;
        });

        const categoryData = {};
        filteredRecords.forEach(record => {
            categoryData[record.category] = (categoryData[record.category] || 0) + Math.abs(record.amount);
        });

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(categoryChart, {
            type: "pie", // 使用圓餅圖
            data: {
                labels, // 分類標籤
                datasets: [{
                    data,
                    backgroundColor: labels.map(() => `hsl(${Math.random() * 360}, 70%, 70%)`),
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: "top",
                    }
                }
            }
        });
    };

    // 渲染記帳列表
    const updateRecordList = () => {
        recordList.innerHTML = ""; // 清空列表

        // 排序數據
        records = [...records].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);

            // 根據日期降序排序
            if (dateA > dateB) return 1;
            if (dateA < dateB) return -1;

            // 日期相同時，根據分類列表順序排序
            const categoryIndexA = categories.indexOf(a.category);
            const categoryIndexB = categories.indexOf(b.category);

            if (categoryIndexA < categoryIndexB) return -1;
            if (categoryIndexA > categoryIndexB) return 1;

            return 0; // 日期和分類相同時保持不變
        });

        // 計算當前頁的記錄範圍
        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = Math.min(startIndex + recordsPerPage, records.length);

        // 獲取當前頁記錄
        const currentRecords = records.slice(startIndex, endIndex);

        // 渲染記錄
        currentRecords.forEach((record, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td>${record.date}</td>
            <td>${record.category}</td>
            <td>${record.amount}</td>
            <td>${record.note || ""}</td>
            <td>
                <button class="btn btn-sm btn-warning edit-btn" data-index="${startIndex + index}">編輯</button>
                <button class="btn btn-sm btn-danger delete-btn" data-index="${startIndex + index}">刪除</button>
            </td>
        `;
            recordList.appendChild(tr);
        });

        // 綁定編輯和刪除按鈕事件
        document.querySelectorAll(".edit-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const index = e.target.getAttribute("data-index");
                editRecord(index);
            });
        });

        document.querySelectorAll(".delete-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const index = e.target.getAttribute("data-index");
                deleteRecord(index);
            });
        });
    };

    // 渲染分類列表
    const updateCategoryList = () => {
        const categoryList = document.getElementById("category-list");
        categoryList.innerHTML = ""; // 清空列表

        // 計算當前頁的分類範圍
        const startIndex = (currentCategoryPage - 1) * categoriesPerPage;
        const endIndex = Math.min(startIndex + categoriesPerPage, categories.length);

        // 獲取當前頁的分類
        const currentCategories = categories.slice(startIndex, endIndex);

        // 渲染分類
        currentCategories.forEach((category, index) => {
            const li = document.createElement("li");
            li.className = "list-group-item d-flex justify-content-between align-items-center";
            li.textContent = category;

            // 刪除按鈕
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "btn btn-sm btn-danger";
            deleteBtn.textContent = "刪除";
            deleteBtn.onclick = () => {
                categories.splice(categories.indexOf(category), 1); // 刪除分類
                localStorage.setItem("categories", JSON.stringify(categories)); // 保存更新到 LocalStorage
                updateCategoryList(); // 重新渲染列表
                renderCategoryPagination(); // 重新渲染分頁按鈕
            };

            li.appendChild(deleteBtn);
            categoryList.appendChild(li);
        });
    };

    // 渲染分類分頁按鈕
    const renderCategoryPagination = () => {
        const categoryPagination = document.getElementById("category-pagination");
        categoryPagination.innerHTML = ""; // 清空分頁按鈕

        const totalPages = Math.ceil(categories.length / categoriesPerPage);

        // 添加「上一頁」按鈕
        const prevItem = document.createElement("li");
        prevItem.className = `page-item ${currentCategoryPage === 1 ? "disabled" : ""}`;
        prevItem.innerHTML = `<a class="page-link" href="#">上一頁</a>`;
        prevItem.addEventListener("click", () => {
            if (currentCategoryPage > 1) {
                currentCategoryPage--;
                updateCategoryList();
                renderCategoryPagination();
            }
        });
        categoryPagination.appendChild(prevItem);

        // 添加頁碼按鈕
        for (let i = 1; i <= totalPages; i++) {
            const pageItem = document.createElement("li");
            pageItem.className = `page-item ${i === currentCategoryPage ? "active" : ""}`;
            pageItem.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            pageItem.addEventListener("click", () => {
                currentCategoryPage = i;
                updateCategoryList();
                renderCategoryPagination();
            });
            categoryPagination.appendChild(pageItem);
        }

        // 添加「下一頁」按鈕
        const nextItem = document.createElement("li");
        nextItem.className = `page-item ${currentCategoryPage === totalPages ? "disabled" : ""}`;
        nextItem.innerHTML = `<a class="page-link" href="#">下一頁</a>`;
        nextItem.addEventListener("click", () => {
            if (currentCategoryPage < totalPages) {
                currentCategoryPage++;
                updateCategoryList();
                renderCategoryPagination();
            }
        });
        categoryPagination.appendChild(nextItem);
    };

    // 初始化分頁功能
    const initPagination = () => {
        currentPage = 1; // 默認為第 1 頁
        renderPagination(); // 渲染分頁按鈕
        updateRecordList(); // 渲染記帳列表
    };

    // 監聽日期輸入事件
    startDateInput.addEventListener("input", updateRecordList);
    endDateInput.addEventListener("input", updateRecordList);

    // 刪除記帳
    const deleteRecord = (index) => {
        records.splice(index, 1); // 刪除指定索引的紀錄
        localStorage.setItem("records", JSON.stringify(records)); // 更新 LocalStorage
        updateRecordList(); // 更新列表
        renderChart(); // 更新圖表
    };

    // 新增篩選功能
    monthFilter.addEventListener("change", renderChart);
    typeFilter.addEventListener("change", renderChart);

    // 初始化分類分頁
    const init = () => {
        updateCategoryOptions();
        updateRecordList();
        populateMonthFilter();
        renderChart();
        initPagination();
        updateCategoryList(); // 渲染分類列表
        renderCategoryPagination(); // 渲染分頁按鈕
    };

    init()
});
