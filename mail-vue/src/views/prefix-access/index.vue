<template>
  <div class="prefix-access-container">
    <div class="access-form" v-if="!isAuthenticated">
      <h2>Access Emails by Prefix</h2>
      <p>Enter your prefix and access password to view emails</p>
      
      <el-form :model="accessForm" :rules="accessRules" ref="accessFormRef" label-width="120px">
        <el-form-item label="Prefix" prop="prefix">
          <el-input v-model="accessForm.prefix" placeholder="Enter your email prefix" />
        </el-form-item>
        
        <el-form-item label="Access Password" prop="accessPassword">
          <el-input 
            v-model="accessForm.accessPassword" 
            type="password" 
            placeholder="Enter your access password"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="verifyAccess" :loading="loading">
            Access Emails
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="email-list" v-else>
      <div class="header">
        <h2>Emails for prefix: {{ currentPrefix }}</h2>
        <el-button @click="logout">Logout</el-button>
      </div>
      
      <div class="email-filters">
        <el-select v-model="emailType" @change="loadEmails" placeholder="Select type">
          <el-option label="Inbox" value="receive" />
          <el-option label="Sent" value="send" />
        </el-select>
      </div>

      <div class="email-items" v-loading="emailLoading">
        <div 
          v-for="email in emails" 
          :key="email.emailId" 
          class="email-item"
          @click="viewEmail(email)"
        >
          <div class="email-header">
            <span class="sender">{{ email.name || email.sendEmail }}</span>
            <span class="time">{{ formatTime(email.createTime) }}</span>
          </div>
          <div class="email-subject">{{ email.subject }}</div>
          <div class="email-preview" v-if="email.text">
            {{ email.text.substring(0, 100) }}...
          </div>
        </div>
        
        <div v-if="emails.length === 0 && !emailLoading" class="no-emails">
          No emails found for this prefix
        </div>
      </div>

      <div class="pagination" v-if="total > 0">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          @current-change="loadEmails"
          layout="prev, pager, next"
        />
      </div>
    </div>

    <!-- Email Detail Modal -->
    <el-dialog v-model="emailDetailVisible" title="Email Details" width="80%" top="5vh">
      <div v-if="selectedEmail" class="email-detail">
        <div class="email-detail-header">
          <h3>{{ selectedEmail.subject }}</h3>
          <div class="email-meta">
            <p><strong>From:</strong> {{ selectedEmail.name }} &lt;{{ selectedEmail.sendEmail }}&gt;</p>
            <p><strong>To:</strong> {{ selectedEmail.toName }} &lt;{{ selectedEmail.toEmail }}&gt;</p>
            <p><strong>Date:</strong> {{ formatTime(selectedEmail.createTime) }}</p>
          </div>
        </div>
        
        <div class="email-content" v-html="selectedEmail.content"></div>
        
        <div v-if="selectedEmail.attList && selectedEmail.attList.length > 0" class="attachments">
          <h4>Attachments:</h4>
          <ul>
            <li v-for="att in selectedEmail.attList" :key="att.attId">
              <a :href="att.url" target="_blank">{{ att.filename }}</a>
            </li>
          </ul>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from '@/axios'
import dayjs from 'dayjs'

const route = useRoute()

// Reactive data
const isAuthenticated = ref(false)
const currentPrefix = ref('')
const accessPassword = ref('')
const loading = ref(false)
const emailLoading = ref(false)
const emails = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const emailType = ref('receive')
const emailDetailVisible = ref(false)
const selectedEmail = ref(null)

// Access form
const accessForm = reactive({
  prefix: '',
  accessPassword: ''
})

const accessRules = {
  prefix: [
    { required: true, message: 'Please enter your prefix', trigger: 'blur' }
  ],
  accessPassword: [
    { required: true, message: 'Please enter your access password', trigger: 'blur' }
  ]
}

const accessFormRef = ref()

// Methods
const verifyAccess = async () => {
  if (!accessFormRef.value) return
  
  await accessFormRef.value.validate()
  
  loading.value = true
  try {
    const response = await axios.post(`/api/prefix-access/${accessForm.prefix}/verify`, {
      accessPassword: accessForm.accessPassword
    })
    
    if (response.data.data.valid) {
      isAuthenticated.value = true
      currentPrefix.value = accessForm.prefix
      accessPassword.value = accessForm.accessPassword
      await loadEmails()
      ElMessage.success('Access granted')
    } else {
      ElMessage.error('Invalid prefix or access password')
    }
  } catch (error) {
    ElMessage.error('Verification failed')
  } finally {
    loading.value = false
  }
}

const loadEmails = async () => {
  if (!isAuthenticated.value) return
  
  emailLoading.value = true
  try {
    const response = await axios.post(`/api/prefix-access/${currentPrefix.value}/emails`, {
      accessPassword: accessPassword.value,
      type: emailType.value,
      size: pageSize.value,
      emailId: currentPage.value === 1 ? 0 : emails.value[emails.value.length - 1]?.emailId || 0,
      timeSort: 1
    })
    
    emails.value = response.data.data.list || []
    total.value = response.data.data.total || 0
  } catch (error) {
    ElMessage.error('Failed to load emails')
  } finally {
    emailLoading.value = false
  }
}

const viewEmail = (email) => {
  selectedEmail.value = email
  emailDetailVisible.value = true
}

const logout = () => {
  isAuthenticated.value = false
  currentPrefix.value = ''
  accessPassword.value = ''
  emails.value = []
  total.value = 0
  currentPage.value = 1
}

const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

// Initialize
onMounted(() => {
  // Check if prefix is provided in URL
  if (route.params.prefix) {
    accessForm.prefix = route.params.prefix
  }
})
</script>

<style scoped>
.prefix-access-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.access-form {
  max-width: 500px;
  margin: 50px auto;
  padding: 30px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.access-form h2 {
  text-align: center;
  margin-bottom: 10px;
  color: #333;
}

.access-form p {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.email-filters {
  margin-bottom: 20px;
}

.email-items {
  min-height: 400px;
}

.email-item {
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.email-item:hover {
  background-color: #f5f5f5;
  border-color: #409eff;
}

.email-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.sender {
  font-weight: bold;
  color: #333;
}

.time {
  color: #666;
  font-size: 12px;
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
}

.no-emails {
  text-align: center;
  color: #666;
  padding: 50px;
  font-size: 16px;
}

.pagination {
  margin-top: 20px;
  text-align: center;
}

.email-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.email-detail-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.email-detail-header h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.email-meta p {
  margin: 5px 0;
  color: #666;
  font-size: 14px;
}

.email-content {
  margin-bottom: 20px;
  line-height: 1.6;
}

.attachments {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.attachments h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.attachments ul {
  margin: 0;
  padding-left: 20px;
}

.attachments li {
  margin: 5px 0;
}

.attachments a {
  color: #409eff;
  text-decoration: none;
}

.attachments a:hover {
  text-decoration: underline;
}
</style>