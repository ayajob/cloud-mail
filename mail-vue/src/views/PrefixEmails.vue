<template>
  <div class="prefix-emails-container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <h2>📧 Emails for: {{ auth.prefix }}@*</h2>
        <el-tag type="info" size="small">{{ stats.totalEmails }} total emails</el-tag>
      </div>
      <div class="header-right">
        <el-button @click="refreshEmails" :loading="loading" icon="Refresh">
          Refresh
        </el-button>
        <el-button @click="logout" type="danger" plain>
          Logout
        </el-button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ stats.totalEmails }}</div>
              <div class="stat-label">Total Emails</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ stats.recentEmails }}</div>
              <div class="stat-label">Recent (7 days)</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ unreadCount }}</div>
              <div class="stat-label">Unread</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- Email List -->
    <div class="email-list-section">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>Email List</span>
            <div class="header-actions">
              <el-input
                v-model="searchQuery"
                placeholder="Search emails..."
                size="small"
                style="width: 200px"
                prefix-icon="Search"
                @input="handleSearch"
              />
            </div>
          </div>
        </template>

        <div v-loading="loading" class="email-list">
          <div v-if="emails.length === 0 && !loading" class="empty-state">
            <el-empty description="No emails found" />
          </div>
          
          <div 
            v-for="email in filteredEmails" 
            :key="email.emailId"
            class="email-item"
            :class="{ 'unread': !email.isRead }"
            @click="openEmail(email)"
          >
            <div class="email-header">
              <div class="email-from">
                <strong>{{ email.name || email.sendEmail }}</strong>
                <span class="email-address">&lt;{{ email.sendEmail }}&gt;</span>
              </div>
              <div class="email-date">
                {{ formatDate(email.createTime) }}
              </div>
            </div>
            
            <div class="email-to">
              <span class="to-label">To:</span> {{ email.toEmail }}
            </div>
            
            <div class="email-subject">
              {{ email.subject || '(No Subject)' }}
            </div>
            
            <div class="email-preview">
              {{ getEmailPreview(email) }}
            </div>
            
            <div class="email-meta">
              <el-tag v-if="email.attList && email.attList.length > 0" size="small" type="info">
                📎 {{ email.attList.length }} attachment(s)
              </el-tag>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination-section" v-if="totalEmails > pageSize">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="totalEmails"
            layout="prev, pager, next, jumper"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>
    </div>

    <!-- Email Detail Dialog -->
    <el-dialog
      v-model="emailDialogVisible"
      :title="selectedEmail?.subject || '(No Subject)'"
      width="80%"
      top="5vh"
      class="email-dialog"
    >
      <div v-if="selectedEmail" class="email-detail">
        <div class="email-detail-header">
          <div class="detail-row">
            <span class="label">From:</span>
            <span>{{ selectedEmail.name || selectedEmail.sendEmail }} &lt;{{ selectedEmail.sendEmail }}&gt;</span>
          </div>
          <div class="detail-row">
            <span class="label">To:</span>
            <span>{{ selectedEmail.toEmail }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Date:</span>
            <span>{{ formatDate(selectedEmail.createTime) }}</span>
          </div>
          <div v-if="selectedEmail.cc && selectedEmail.cc !== '[]'" class="detail-row">
            <span class="label">CC:</span>
            <span>{{ formatRecipients(selectedEmail.cc) }}</span>
          </div>
        </div>
        
        <el-divider />
        
        <div class="email-content" v-html="selectedEmail.content || selectedEmail.text"></div>
        
        <div v-if="selectedEmail.attList && selectedEmail.attList.length > 0" class="attachments">
          <el-divider />
          <h4>Attachments:</h4>
          <div class="attachment-list">
            <div v-for="att in selectedEmail.attList" :key="att.attId" class="attachment-item">
              <el-tag>📎 {{ att.filename }} ({{ formatFileSize(att.size) }})</el-tag>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { prefixApi } from '../request/prefix'
import dayjs from 'dayjs'

const router = useRouter()

// Auth state
const auth = ref({})
const stats = reactive({
  totalEmails: 0,
  recentEmails: 0
})

// Email list state
const emails = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const totalEmails = ref(0)
const searchQuery = ref('')

// Email detail state
const emailDialogVisible = ref(false)
const selectedEmail = ref(null)

// Computed
const unreadCount = computed(() => {
  return emails.value.filter(email => !email.isRead).length
})

const filteredEmails = computed(() => {
  if (!searchQuery.value) return emails.value
  
  const query = searchQuery.value.toLowerCase()
  return emails.value.filter(email => 
    email.subject?.toLowerCase().includes(query) ||
    email.sendEmail?.toLowerCase().includes(query) ||
    email.name?.toLowerCase().includes(query) ||
    email.text?.toLowerCase().includes(query)
  )
})

// Methods
const loadAuth = () => {
  const authData = sessionStorage.getItem('prefix_auth')
  if (!authData) {
    router.push('/prefix-login')
    return false
  }
  
  auth.value = JSON.parse(authData)
  return true
}

const loadStats = async () => {
  try {
    const response = await prefixApi.getStats(auth.value)
    if (response.code === 200) {
      Object.assign(stats, response.data)
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

const loadEmails = async (page = 1) => {
  try {
    loading.value = true
    const response = await prefixApi.getEmails({
      ...auth.value,
      page,
      size: pageSize.value
    })
    
    if (response.code === 200) {
      emails.value = response.data.list || []
      totalEmails.value = response.data.total || 0
      currentPage.value = response.data.page || 1
    } else {
      ElMessage.error(response.message || 'Failed to load emails')
    }
  } catch (error) {
    console.error('Failed to load emails:', error)
    ElMessage.error('Failed to load emails')
  } finally {
    loading.value = false
  }
}

const refreshEmails = async () => {
  await Promise.all([loadStats(), loadEmails(currentPage.value)])
  ElMessage.success('Emails refreshed')
}

const handlePageChange = (page) => {
  loadEmails(page)
}

const handleSearch = () => {
  // Search is handled by computed property
}

const openEmail = async (email) => {
  try {
    const response = await prefixApi.getEmailDetail({
      ...auth.value,
      emailId: email.emailId
    })
    
    if (response.code === 200) {
      selectedEmail.value = response.data
      emailDialogVisible.value = true
      
      // Mark as read
      await prefixApi.markAsRead({
        ...auth.value,
        emailId: email.emailId
      })
      
      // Update local state
      const emailIndex = emails.value.findIndex(e => e.emailId === email.emailId)
      if (emailIndex !== -1) {
        emails.value[emailIndex].isRead = true
      }
    }
  } catch (error) {
    console.error('Failed to load email detail:', error)
    ElMessage.error('Failed to load email detail')
  }
}

const logout = async () => {
  try {
    await ElMessageBox.confirm('Are you sure you want to logout?', 'Confirm', {
      type: 'warning'
    })
    
    sessionStorage.removeItem('prefix_auth')
    router.push('/prefix-login')
  } catch {
    // User cancelled
  }
}

const formatDate = (timestamp) => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatRecipients = (recipientsJson) => {
  try {
    const recipients = JSON.parse(recipientsJson)
    return recipients.map(r => r.address).join(', ')
  } catch {
    return recipientsJson
  }
}

const getEmailPreview = (email) => {
  const text = email.text || email.content?.replace(/<[^>]*>/g, '') || ''
  return text.substring(0, 150) + (text.length > 150 ? '...' : '')
}

// Lifecycle
onMounted(async () => {
  if (!loadAuth()) return
  
  await Promise.all([loadStats(), loadEmails()])
})
</script>

<style scoped>
.prefix-emails-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left h2 {
  margin: 0 0 5px 0;
  color: #333;
}

.header-right {
  display: flex;
  gap: 10px;
}

.stats-section {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
}

.stat-content {
  padding: 10px;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

.stat-label {
  color: #666;
  font-size: 14px;
  margin-top: 5px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.email-list {
  min-height: 400px;
}

.email-item {
  padding: 15px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
}

.email-item:hover {
  background-color: #f5f7fa;
}

.email-item.unread {
  background-color: #f0f9ff;
  border-left: 3px solid #409eff;
}

.email-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.email-from {
  font-weight: 500;
}

.email-address {
  color: #666;
  font-weight: normal;
  margin-left: 5px;
}

.email-date {
  color: #999;
  font-size: 14px;
}

.email-to {
  color: #666;
  font-size: 14px;
  margin-bottom: 5px;
}

.to-label {
  font-weight: 500;
}

.email-subject {
  font-weight: 500;
  margin-bottom: 5px;
  color: #333;
}

.email-preview {
  color: #666;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 5px;
}

.email-meta {
  display: flex;
  gap: 10px;
}

.pagination-section {
  margin-top: 20px;
  text-align: center;
}

.empty-state {
  text-align: center;
  padding: 40px;
}

.email-detail-header {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 15px;
}

.detail-row {
  margin-bottom: 8px;
  display: flex;
  align-items: flex-start;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 500;
  min-width: 60px;
  color: #666;
}

.email-content {
  line-height: 1.6;
  max-height: 500px;
  overflow-y: auto;
}

.attachments {
  margin-top: 20px;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.attachment-item {
  margin-bottom: 5px;
}

:deep(.email-dialog .el-dialog__body) {
  max-height: 70vh;
  overflow-y: auto;
}
</style>