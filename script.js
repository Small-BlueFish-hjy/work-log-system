class WorkLogSystem {
    constructor() {
        this.logs = [];
        this.projects = [];
        this.settings = {};
        this.tags = new Set();
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilter = {};
        
        this.init();
    }
    
    init() {
        this.loadData();
        this.setupEventListeners();
        this.updateUI();
        this.setupCharts();
        this.showLoading(false);
        
        // 显示今日日期
        const today = new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        document.getElementById('today-date').textContent = today;
        
        // 初始化日期选择器
        const todayInput = new Date().toISOString().split('T')[0];
        document.getElementById('log-date').value = todayInput;
        document.getElementById('log-date').max = todayInput;
        
        // 设置默认时间
        const now = new Date();
        const startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2小时前
        document.getElementById('log-start-time').value = 
            startTime.toTimeString().slice(0, 5);
        document.getElementById('log-end-time').value = 
            now.toTimeString().slice(0, 5);
    }
    
    loadData() {
        // 从localStorage加载数据
        this.logs = JSON.parse(localStorage.getItem('workLogs') || '[]');
        this.projects = JSON.parse(localStorage.getItem('workProjects') || '[]');
        this.settings = JSON.parse(localStorage.getItem('workSettings') || '{}');
        this.tags = new Set(JSON.parse(localStorage.getItem('workTags') || '[]'));
        
        // 如果没有默认项目，创建一些示例
        if (this.projects.length === 0) {
            this.projects = [
                { id: '1', name: '日常工作', color: '#4CAF50', status: 'active' },
                { id: '2', name: '项目开发', color: '#2196F3', status: 'active' },
                { id: '3', name: '学习提升', color: '#9C27B0', status: 'active' },
                { id: '4', name: '会议讨论', color: '#FF9800', status: 'active' }
            ];
            this.saveProjects();
        }
        
        // 加载用户名
        if (this.settings.username) {
            document.getElementById('username').textContent = this.settings.username;
            document.getElementById('set-username').value = this.settings.username;
        }
    }
    
    saveData() {
        localStorage.setItem('workLogs', JSON.stringify(this.logs));
        localStorage.setItem('workProjects', JSON.stringify(this.projects));
        localStorage.setItem('workSettings', JSON.stringify(this.settings));
        localStorage.setItem('workTags', JSON.stringify([...this.tags]));
    }
    
    setupEventListeners() {
        // 导航菜单
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = item.getAttribute('href').substring(1);
                this.showPage(pageId);
                
                // 更新活动状态
                document.querySelectorAll('.nav-item').forEach(nav => 
                    nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
        
        // 主题切换
        document.getElementById('theme-toggle').addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            this.settings.theme = newTheme;
            this.saveData();
            
            // 更新图标
            const icon = document.querySelector('#theme-toggle i');
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        });
        
        // 保存工作记录
        document.getElementById('log-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveWorkLog();
        });
        
        // 标签输入
        document.getElementById('tag-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tag = e.target.value.trim();
                if (tag) {
                    this.addTag(tag);
                    e.target.value = '';
                }
            }
        });
        
        // 标签建议
        document.querySelectorAll('.tag-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', (e) => {
                const tag = e.target.dataset.tag;
                this.addTag(tag);
            });
        });
        
        // 添加项目按钮
        document.getElementById('add-project-btn').addEventListener('click', () => {
            this.showProjectModal();
        });
        
        // 搜索功能
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.currentFilter.search = e.target.value;
            this.currentPage = 1;
            this.displayLogs();
        });
        
        // 筛选器
        document.getElementById('apply-filters').addEventListener('click', () => {
            this.applyFilters();
        });
        
        document.getElementById('clear-filters').addEventListener('click', () => {
            this.clearFilters();
        });
        
        // 分页
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.displayLogs();
            }
        });
        
        document.getElementById('next-page').addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredLogs.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.displayLogs();
            }
        });
        
        // 导出数据
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.closest('.format-btn').dataset.format;
                this.exportData(format);
            });
        });
        
        // 导入数据
        document.getElementById('import-btn').addEventListener('click', () => {
            this.importData();
        });
        
        // 备份数据
        document.getElementById('backup-now').addEventListener('click', () => {
            this.createBackup();
        });
        
        // 保存设置
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });
        
        // 初始化项目下拉框
        this.updateProjectSelect();
        
        // 监听时间范围选择
        document.getElementById('filter-period').addEventListener('change', (e) => {
            const customRange = document.getElementById('custom-date-range');
            customRange.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });
        
        // 视图切换
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.closest('.view-btn').dataset.view;
                this.switchView(view);
            });
        });
        
        // 显示通知中心
        document.getElementById('notifications').addEventListener('click', () => {
            document.getElementById('notification-center').classList.toggle('active');
        });
        
        // 关闭通知中心
        document.querySelector('.close-notifications').addEventListener('click', () => {
            document.getElementById('notification-center').classList.remove('active');
        });
        
        // 关闭模态框
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.remove('active');
                });
            });
        });
        
        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
    }
    
    showPage(pageId) {
        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // 显示目标页面
        document.getElementById(`${pageId}-page`).classList.add('active');
        
        // 更新页面特定内容
        switch(pageId) {
            case 'view-logs':
                this.displayLogs();
                break;
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'statistics':
                this.updateStatistics();
                break;
            case 'projects':
                this.displayProjects();
                break;
        }
    }
    
    updateProjectSelect() {
        const select = document.getElementById('log-project');
        select.innerHTML = '<option value="">选择项目</option>';
        
        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            option.style.color = project.color;
            select.appendChild(option);
        });
    }
    
    addTag(tag) {
        this.tags.add(tag);
        this.saveData();
        
        const tagsContainer = document.getElementById('tags-container');
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.innerHTML = `
            ${tag}
            <span class="tag-remove" data-tag="${tag}">&times;</span>
        `;
        tagsContainer.appendChild(tagElement);
        
        // 添加删除事件
        tagElement.querySelector('.tag-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeTag(tag);
            tagElement.remove();
        });
    }
    
    removeTag(tag) {
        this.tags.delete(tag);
        this.saveData();
    }
    
    saveWorkLog() {
        const startTime = document.getElementById('log-start-time').value;
        const endTime = document.getElementById('log-end-time').value;
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        const duration = (end - start) / (1000 * 60 * 60); // 小时
        
        if (duration <= 0) {
            this.showNotification('结束时间必须晚于开始时间', 'error');
            return;
        }
        
        const log = {
            id: Date.now().toString(),
            date: document.getElementById('log-date').value,
            startTime,
            endTime,
            duration: duration.toFixed(2),
            title: document.getElementById('log-title').value,
            projectId: document.getElementById('log-project').value,
            projectName: document.getElementById('log-project').selectedOptions[0]?.text,
            content: document.getElementById('log-content').value,
            tags: Array.from(this.tags),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.logs.unshift(log);
        this.saveData();
        
        // 重置表单
        document.getElementById('log-form').reset();
        document.getElementById('tags-container').innerHTML = '';
        this.tags.clear();
        
        this.showNotification('工作记录保存成功！', 'success');
        
        // 更新仪表板
        this.updateDashboard();
        
        // 跳转到查看页面
        this.showPage('view-logs');
    }
    
    displayLogs() {
        const container = document.getElementById('logs-container');
        const totalCount = document.getElementById('total-logs-count');
        
        // 应用筛选
        this.applyFilters();
        
        // 计算分页
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageLogs = this.filteredLogs.slice(startIndex, endIndex);
        
        // 清空容器
        container.innerHTML = '';
        
        if (pageLogs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list fa-3x"></i>
                    <h3>暂无工作记录</h3>
                    <p>点击"新增记录"开始记录您的工作</p>
                </div>
            `;
            totalCount.textContent = '0';
            return;
        }
        
        // 显示记录
        pageLogs.forEach(log => {
            const project = this.projects.find(p => p.id === log.projectId);
            const logElement = document.createElement('div');
            logElement.className = 'log-item';
            logElement.innerHTML = `
                <div class="log-header">
                    <h3 class="log-title">${log.title}</h3>
                    <span class="log-time">${log.date} | ${log.duration}小时</span>
                </div>
                <div class="log-meta">
                    <span class="log-project" style="color: ${project?.color || '#666'}">
                        <i class="fas fa-project-diagram"></i> ${log.projectName || '无项目'}
                    </span>
                    <div class="log-tags">
                        ${log.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
                <div class="log-content">
                    ${log.content.replace(/\n/g, '<br>')}
                </div>
                <div class="log-actions">
                    <button class="btn-small edit-log" data-id="${log.id}">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="btn-small delete-log" data-id="${log.id}">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                    <button class="btn-small copy-log" data-id="${log.id}">
                        <i class="fas fa-copy"></i> 复制
                    </button>
                </div>
            `;
            container.appendChild(logElement);
        });
        
        // 更新计数和分页
        totalCount.textContent = this.filteredLogs.length;
        this.updatePagination();
        
        // 添加操作事件
        this.addLogActions();
    }
    
    applyFilters() {
        const period = document.getElementById('filter-period').value;
        const project = document.getElementById('filter-project').value;
        const search = document.getElementById('search-input').value.toLowerCase();
        
        this.filteredLogs = this.logs.filter(log => {
            // 时间筛选
            if (period !== 'all') {
                const logDate = new Date(log.date);
                const today = new Date();
                
                switch(period) {
                    case 'today':
                        if (logDate.toDateString() !== today.toDateString()) return false;
                        break;
                    case 'week':
                        const weekStart = new Date(today);
                        weekStart.setDate(today.getDate() - today.getDay());
                        if (logDate < weekStart) return false;
                        break;
                    case 'month':
                        if (logDate.getMonth() !== today.getMonth() || 
                            logDate.getFullYear() !== today.getFullYear()) return false;
                        break;
                    case 'custom':
                        const startDate = document.getElementById('start-date').value;
                        const endDate = document.getElementById('end-date').value;
                        if (startDate && endDate) {
                            if (log.date < startDate || log.date > endDate) return false;
                        }
                        break;
                }
            }
            
            // 项目筛选
            if (project && log.projectId !== project) return false;
            
            // 搜索筛选
            if (search && !log.title.toLowerCase().includes(search) && 
                !log.content.toLowerCase().includes(search)) return false;
            
            return true;
        });
        
        // 排序
        const sort = document.getElementById('filter-sort').value;
        this.filteredLogs.sort((a, b) => {
            switch(sort) {
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date);
                case 'date-asc':
                    return new Date(a.date) - new Date(b.date);
                case 'duration-desc':
                    return parseFloat(b.duration) - parseFloat(a.duration);
                case 'duration-asc':
                    return parseFloat(a.duration) - parseFloat(b.duration);
                default:
                    return 0;
            }
        });
    }
    
    updatePagination() {
        const totalPages = Math.ceil(this.filteredLogs.length / this.itemsPerPage);
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        pageInfo.textContent = `第${this.currentPage}页 / 共${totalPages}页`;
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= totalPages;
    }
    
    addLogActions() {
        // 编辑记录
        document.querySelectorAll('.edit-log').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const logId = e.target.closest('.edit-log').dataset.id;
                this.editLog(logId);
            });
        });
        
        // 删除记录
        document.querySelectorAll('.delete-log').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const logId = e.target.closest('.delete-log').dataset.id;
                if (confirm('确定要删除这条记录吗？')) {
                    this.deleteLog(logId);
                }
            });
        });
        
        // 复制记录
        document.querySelectorAll('.copy-log').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const logId = e.target.closest('.copy-log').dataset.id;
                this.copyLog(logId);
            });
        });
    }
    
    editLog(logId) {
        const log = this.logs.find(l => l.id === logId);
        if (!log) return;
        
        // 填充表单
        document.getElementById('log-date').value = log.date;
        document.getElementById('log-start-time').value = log.startTime;
        document.getElementById('log-end-time').value = log.endTime;
        document.getElementById('log-title').value = log.title;
        document.getElementById('log-project').value = log.projectId;
        document.getElementById('log-content').value = log.content;
        
        // 添加标签
        log.tags.forEach(tag => this.addTag(tag));
        
        // 显示添加页面
        this.showPage('add-log');
        
        // 修改表单提交行为为更新
        const form = document.getElementById('log-form');
        const originalSubmit = form.onsubmit;
        
        form.onsubmit = (e) => {
            e.preventDefault();
            
            // 更新记录
            log.date = document.getElementById('log-date').value;
            log.startTime = document.getElementById('log-start-time').value;
            log.endTime = document.getElementById('log-end-time').value;
            log.title = document.getElementById('log-title').value;
            log.projectId = document.getElementById('log-project').value;
            log.projectName = document.getElementById('log-project').selectedOptions[0]?.text;
            log.content = document.getElementById('log-content').value;
            log.tags = Array.from(this.tags);
            log.duration = this.calculateDuration(log.startTime, log.endTime);
            log.updatedAt = new Date().toISOString();
            
            this.saveData();
            this.showNotification('记录更新成功！', 'success');
            
            // 恢复原始提交行为
            form.onsubmit = originalSubmit;
            form.reset();
            document.getElementById('tags-container').innerHTML = '';
            this.tags.clear();
            
            // 返回查看页面
            this.showPage('view-logs');
        };
    }
    
    deleteLog(logId) {
        const index = this.logs.findIndex(l => l.id === logId);
        if (index !== -1) {
            this.logs.splice(index, 1);
            this.saveData();
            this.displayLogs();
            this.updateDashboard();
            this.showNotification('记录删除成功！', 'success');
        }
    }
    
    copyLog(logId) {
        const log = this.logs.find(l => l.id === logId);
        if (!log) return;
        
        const newLog = {
            ...log,
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.logs.unshift(newLog);
        this.saveData();
        this.displayLogs();
        this.showNotification('记录复制成功！', 'success');
    }
    
    calculateDuration(startTime, endTime) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        return ((end - start) / (1000 * 60 * 60)).toFixed(2);
    }
    
    updateDashboard() {
        // 计算今日工作时长
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = this.logs.filter(log => log.date === today);
        const todayHours = todayLogs.reduce((sum, log) => sum + parseFloat(log.duration), 0);
        document.getElementById('today-hours').textContent = `${todayHours.toFixed(1)} 小时`;
        
        // 计算本月记录数
        const now = new Date();
        const monthLogs = this.logs.filter(log => {
            const logDate = new Date(log.date);
            return logDate.getMonth() === now.getMonth() && 
                   logDate.getFullYear() === now.getFullYear();
        });
        document.getElementById('month-logs').textContent = `${monthLogs.length} 条`;
        
        // 计算活跃项目数
        const activeProjects = this.projects.filter(p => p.status === 'active').length;
        document.getElementById('active-projects').textContent = `${activeProjects} 个`;
        
        // 计算本周效率（这里简化为任务完成率）
        const completedTasks = this.logs.filter(log => 
            log.tags && log.tags.includes('完成')
        ).length;
        const totalTasks = this.logs.length;
        const efficiency = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        document.getElementById('week-efficiency').textContent = `${efficiency}%`;
        
        // 更新最近活动
        this.updateActivities();
        
        // 更新图表
        this.updateCharts();
    }
    
    updateActivities() {
        const container = document.getElementById('activities-list');
        const recentLogs = this.logs.slice(0, 10);
        
        container.innerHTML = recentLogs.map(log => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="activity-details">
                    <p class="activity-title">${log.title}</p>
                    <p class="activity-time">${log.date} ${log.startTime}</p>
                </div>
                <div class="activity-duration">
                    ${log.duration}h
                </div>
            </div>
        `).join('');
    }
    
    setupCharts() {
        // 初始化图表实例
        this.weekChart = new Chart(
            document.getElementById('weekChart').getContext('2d'),
            {
                type: 'bar',
                data: {
                    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                    datasets: [{
                        label: '工作时长',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        backgroundColor: 'rgba(67, 97, 238, 0.5)',
                        borderColor: 'rgba(67, 97, 238, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '小时'
                            }
                        }
                    }
                }
            }
        );
        
        this.projectChart = new Chart(
            document.getElementById('projectChart').getContext('2d'),
            {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: []
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            }
        );
    }
    
    updateCharts() {
        // 更新本周工作时间分布
        const weekData = [0, 0, 0, 0, 0, 0, 0];
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        this.logs.forEach(log => {
            const logDate = new Date(log.date);
            if (logDate >= startOfWeek) {
                const dayIndex = logDate.getDay();
                weekData[dayIndex] += parseFloat(log.duration);
            }
        });
        
        this.weekChart.data.datasets[0].data = weekData;
        this.weekChart.update();
        
        // 更新项目时间占比
        const projectData = {};
        this.logs.forEach(log => {
            if (log.projectName) {
                projectData[log.projectName] = (projectData[log.projectName] || 0) + parseFloat(log.duration);
            }
        });
        
        const projectNames = Object.keys(projectData);
        const projectDurations = Object.values(projectData);
        const projectColors = projectNames.map(name => {
            const project = this.projects.find(p => p.name === name);
            return project?.color || this.getRandomColor();
        });
        
        this.projectChart.data.labels = projectNames;
        this.projectChart.data.datasets[0].data = projectDurations;
        this.projectChart.data.datasets[0].backgroundColor = projectColors;
        this.projectChart.update();
    }
    
    getRandomColor() {
        return `#${Math.floor(Math.random()*16777215).toString(16)}`;
    }
    
    switchView(view) {
        const container = document.getElementById('logs-container');
        container.className = `logs-container ${view}-view`;
        
        // 更新按钮状态
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.view-btn[data-view="${view}"]`).classList.add('active');
    }
    
    clearFilters() {
        document.getElementById('filter-period').value = 'all';
        document.getElementById('filter-project').value = '';
        document.getElementById('filter-sort').value = 'date-desc';
        document.getElementById('search-input').value = '';
        document.getElementById('custom-date-range').style.display = 'none';
        
        this.currentFilter = {};
        this.currentPage = 1;
        this.displayLogs();
    }
    
    showProjectModal(project = null) {
        const modal = document.getElementById('project-modal');
        const form = document.getElementById('project-form');
        
        if (project) {
            // 编辑模式
            document.getElementById('project-name').value = project.name;
            document.getElementById('project-description').value = project.description || '';
            document.getElementById('project-start-date').value = project.startDate || '';
            document.getElementById('project-end-date').value = project.endDate || '';
            document.getElementById('project-status').value = project.status || 'active';
            document.getElementById('project-color').value = project.color || '#4CAF50';
        } else {
            // 新建模式
            form.reset();
            document.getElementById('project-color').value = '#4CAF50';
        }
        
        modal.classList.add('active');
        
        // 设置表单提交事件
        form.onsubmit = (e) => {
            e.preventDefault();
            this.saveProject(project);
        };
        
        // 删除项目按钮
        const deleteBtn = document.querySelector('.delete-project');
        deleteBtn.style.display = project ? 'block' : 'none';
        deleteBtn.onclick = project ? () => {
            if (confirm('确定要删除这个项目吗？')) {
                this.deleteProject(project.id);
                modal.classList.remove('active');
            }
        } : null;
    }
    
    saveProject(project) {
        const projectData = {
            id: project?.id || Date.now().toString(),
            name: document.getElementById('project-name').value,
            description: document.getElementById('project-description').value,
            startDate: document.getElementById('project-start-date').value,
            endDate: document.getElementById('project-end-date').value,
            status: document.getElementById('project-status').value,
            color: document.getElementById('project-color').value,
            createdAt: project?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (project) {
            const index = this.projects.findIndex(p => p.id === project.id);
            if (index !== -1) {
                this.projects[index] = projectData;
            }
        } else {
            this.projects.push(projectData);
        }
        
        this.saveProjects();
        this.updateProjectSelect();
        this.displayProjects();
        this.showNotification('项目保存成功！', 'success');
        
        document.getElementById('project-modal').classList.remove('active');
    }
    
    deleteProject(projectId) {
        this.projects = this.projects.filter(p => p.id !== projectId);
        this.saveProjects();
        this.updateProjectSelect();
        this.displayProjects();
        this.showNotification('项目删除成功！', 'success');
    }
    
    displayProjects() {
        const container = document.getElementById('projects-list');
        
        container.innerHTML = this.projects.map(project => {
            const projectLogs = this.logs.filter(log => log.projectId === project.id);
            const totalHours = projectLogs.reduce((sum, log) => sum + parseFloat(log.duration), 0);
            
            return `
                <div class="project-card" style="border-top-color: ${project.color}">
                    <div class="project-header">
                        <h3>${project.name}</h3>
                        <span class="project-status ${project.status}">
                            ${this.getStatusText(project.status)}
                        </span>
                    </div>
                    <p class="project-description">${project.description || '暂无描述'}</p>
                    
                    <div class="project-stats">
                        <div class="stat">
                            <i class="fas fa-clock"></i>
                            <span>${totalHours.toFixed(1)} 小时</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-list-alt"></i>
                            <span>${projectLogs.length} 条记录</span>
                        </div>
                    </div>
                    
                    <div class="project-progress">
                        <div class="progress-bar">
                            <div class="progress-value" style="width: ${this.calculateProjectProgress(project)}%"></div>
                        </div>
                    </div>
                    
                    <div class="project-actions">
                        <button class="btn-small edit-project" data-id="${project.id}">
                            <i class="fas fa-edit"></i> 编辑
                        </button>
                        <button class="btn-small view-project-logs" data-id="${project.id}">
                            <i class="fas fa-eye"></i> 查看记录
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // 添加项目操作事件
        this.addProjectActions();
    }
    
    getStatusText(status) {
        const statusMap = {
            'planning': '规划中',
            'active': '进行中',
            'completed': '已完成',
            'on-hold': '暂停'
        };
        return statusMap[status] || status;
    }
    
    calculateProjectProgress(project) {
        if (!project.startDate || !project.endDate) return 0;
        
        const start = new Date(project.startDate);
        const end = new Date(project.endDate);
        const today = new Date();
        
        if (today < start) return 0;
        if (today > end) return 100;
        
        const totalDuration = end - start;
        const elapsed = today - start;
        return Math.round((elapsed / totalDuration) * 100);
    }
    
    addProjectActions() {
        // 编辑项目
        document.querySelectorAll('.edit-project').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = e.target.closest('.edit-project').dataset.id;
                const project = this.projects.find(p => p.id === projectId);
                if (project) {
                    this.showProjectModal(project);
                }
            });
        });
        
        // 查看项目记录
        document.querySelectorAll('.view-project-logs').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = e.target.closest('.view-project-logs').dataset.id;
                document.getElementById('filter-project').value = projectId;
                document.getElementById('apply-filters').click();
                this.showPage('view-logs');
            });
        });
    }
    
    saveProjects() {
        localStorage.setItem('workProjects', JSON.stringify(this.projects));
    }
    
    exportData(format) {
        let data, mimeType, filename;
        
        switch(format) {
            case 'json':
                data = JSON.stringify({
                    logs: this.logs,
                    projects: this.projects,
                    settings: this.settings,
                    exportDate: new Date().toISOString()
                }, null, 2);
                mimeType = 'application/json';
                filename = `work-log-backup-${new Date().toISOString().split('T')[0]}.json`;
                break;
                
            case 'csv':
                const headers = ['日期', '开始时间', '结束时间', '时长', '标题', '项目', '内容'];
                const csvData = this.logs.map(log => [
                    log.date,
                    log.startTime,
                    log.endTime,
                    log.duration,
                    `"${log.title.replace(/"/g, '""')}"`,
                    `"${log.projectName || ''}"`,
                    `"${log.content.replace(/"/g, '""').replace(/\n/g, ' ')}"`
                ]);
                data = [headers, ...csvData].map(row => row.join(',')).join('\n');
                mimeType = 'text/csv';
                filename = `work-logs-${new Date().toISOString().split('T')[0]}.csv`;
                break;
                
            default:
                this.showNotification('该格式暂未实现', 'warning');
                return;
        }
        
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification(`数据已导出为${format.toUpperCase()}格式`, 'success');
    }
    
    importData() {
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showNotification('请选择要导入的文件', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(content);
                    
                    if (confirm('是否替换现有数据？点击"确定"替换，点击"取消"合并数据。')) {
                        // 替换数据
                        this.logs = data.logs || [];
                        this.projects = data.projects || [];
                        this.settings = data.settings || {};
                    } else {
                        // 合并数据
                        this.logs = [...(data.logs || []), ...this.logs];
                        this.projects = [...(data.projects || []), ...this.projects];
                        this.settings = { ...this.settings, ...(data.settings || {}) };
                    }
                    
                    this.saveData();
                    this.showNotification('数据导入成功！', 'success');
                    this.updateUI();
                    
                } else if (file.name.endsWith('.csv')) {
                    // CSV导入逻辑
                    this.showNotification('CSV导入功能开发中', 'info');
                }
                
            } catch (error) {
                this.showNotification('文件格式错误: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
        fileInput.value = '';
    }
    
    createBackup() {
        const backup = {
            logs: this.logs,
            projects: this.projects,
            settings: this.settings,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        const backups = JSON.parse(localStorage.getItem('workBackups') || '[]');
        backups.unshift(backup);
        
        // 只保留最近10个备份
        if (backups.length > 10) {
            backups.pop();
        }
        
        localStorage.setItem('workBackups', JSON.stringify(backups));
        this.showNotification('备份创建成功！', 'success');
    }
    
    saveSettings() {
        this.settings = {
            username: document.getElementById('set-username').value,
            dailyGoal: document.getElementById('daily-goal').value,
            weeklyGoal: document.getElementById('weekly-goal').value,
            enableReminders: document.getElementById('enable-reminders').checked,
            reminderTime: document.getElementById('reminder-time').value,
            weeklyReport: document.getElementById('weekly-report').checked,
            theme: document.getElementById('theme-select').value,
            language: document.getElementById('language-select').value,
            backupFrequency: document.getElementById('backup-frequency').value,
            cloudSync: document.getElementById('cloud-sync').checked,
            ...this.settings
        };
        
        this.saveData();
        
        // 更新用户名显示
        if (this.settings.username) {
            document.getElementById('username').textContent = this.settings.username;
        }
        
        // 应用主题
        if (this.settings.theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', this.settings.theme);
        }
        
        this.showNotification('设置保存成功！', 'success');
    }
    
    updateStatistics() {
        // 这里实现统计数据的计算和显示
        // 由于篇幅限制，只实现基本框架
        const now = new Date();
        const monthLogs = this.logs.filter(log => {
            const logDate = new Date(log.date);
            return logDate.getMonth() === now.getMonth() && 
                   logDate.getFullYear() === now.getFullYear();
        });
        
        const totalHours = monthLogs.reduce((sum, log) => sum + parseFloat(log.duration), 0);
        const avgDaily = monthLogs.length > 0 ? totalHours / monthLogs.length : 0;
        
        document.getElementById('avg-daily').textContent = `${avgDaily.toFixed(1)}h`;
        
        // 更新统计表格
        this.updateStatsTable();
    }
    
    updateStatsTable() {
        const tbody = document.getElementById('project-stats-body');
        
        const projectStats = {};
        this.logs.forEach(log => {
            if (log.projectName) {
                if (!projectStats[log.projectName]) {
                    projectStats[log.projectName] = {
                        totalHours: 0,
                        count: 0,
                        color: this.projects.find(p => p.name === log.projectName)?.color || '#666'
                    };
                }
                projectStats[log.projectName].totalHours += parseFloat(log.duration);
                projectStats[log.projectName].count++;
            }
        });
        
        const totalAllHours = Object.values(projectStats).reduce((sum, stat) => sum + stat.totalHours, 0);
        
        tbody.innerHTML = Object.entries(projectStats).map(([name, stat]) => {
            const percentage = totalAllHours > 0 ? (stat.totalHours / totalAllHours * 100).toFixed(1) : 0;
            const avgDaily = stat.count > 0 ? stat.totalHours / stat.count : 0;
            
            return `
                <tr>
                    <td><span class="project-dot" style="background-color: ${stat.color}"></span> ${name}</td>
                    <td>${stat.totalHours.toFixed(1)}h</td>
                    <td>${percentage}%</td>
                    <td>${avgDaily.toFixed(1)}h</td>
                    <td><i class="fas fa-arrow-up text-success"></i></td>
                </tr>
            `;
        }).join('');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            </div>
            <div class="notification-content">
                ${message}
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        document.querySelector('.notifications-list').prepend(notification);
        
        // 添加关闭事件
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // 自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    showLoading(show = true) {
        document.getElementById('loading').style.display = show ? 'flex' : 'none';
    }
    
    updateUI() {
        this.updateDashboard();
        this.updateProjectSelect();
        
        // 更新项目筛选下拉框
        const filterProject = document.getElementById('filter-project');
        filterProject.innerHTML = '<option value="">全部项目</option>';
        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            filterProject.appendChild(option);
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.workLogSystem = new WorkLogSystem();
});