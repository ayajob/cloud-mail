<template>
  <div class="prefix-admin-container">
    <div class="header">
      <h2>Prefix Management</h2>
      <el-button type="primary" @click="showCreateDialog = true" icon="Plus">
        Create New Prefix
      </el-button>
    </div>

    <!-- Prefix List -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>Prefix List</span>
          <el-button @click="loadPrefixes" :loading="loading" icon="Refresh" size="small">
            Refresh
          </el-button>
        </div>
      </template>

      <el-table :data="prefixes" v-loading="loading" stripe>
        <el-table-column prop="prefix" label="Prefix" width="150">
          <template #default="{ row }">
            <el-tag type="primary">{{ row.prefix }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="description" label="Description" min-width="200" />
        
        <el-table-column prop="isActive" label="Status" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'">
              {{ row.isActive ? 'Active' : 'Inactive' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="accessCount" label="Access Count" width="120" />
        
        <el-table-column prop="createTime" label="Created" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createTime) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="lastAccessTime" label="Last Access" width="180">
          <template #default="{ row }">
            {{ row.lastAccessTime ? formatDate(row.lastAccessTime) : 'Never' }}
          </template>
        </el-table-column>
        
        <el-table-column label="Actions" width="200" fixed="right">
          <template #default="{ row }">
            <el-button 
              size="small" 
              @click="editPrefix(row)"
              icon="Edit"
            >
              Edit
            </el-button>
            <el-button 
              size="small" 
              :type="row.isActive ? 'warning' : 'success'"
              @click="togglePrefix(row)"
            >
              {{ row.isActive ? 'Disable' : 'Enable' }}
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deletePrefix(row)"
              icon="Delete"
            >
              Delete
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-section" v-if="total > pageSize">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next, jumper, total"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingPrefix ? 'Edit Prefix' : 'Create New Prefix'"
      width="500px"
    >
      <el-form :model="prefixForm" :rules="prefixRules" ref="prefixFormRef" label-width="120px">
        <el-form-item label="Prefix" prop="prefix">
          <el-input 
            v-model="prefixForm.prefix" 
            placeholder="Enter prefix (e.g., 'test')"
            :disabled="editingPrefix"
          />
          <div class="form-help">
            This will match emails like: {{ prefixForm.prefix || 'prefix' }}@yourdomain.com
          </div>
        </el-form-item>
        
        <el-form-item label="Password" prop="password">
          <el-input 
            v-model="prefixForm.password" 
            type="password" 
            placeholder="Enter access password"
            show-password
          />
        </el-form-item>
        
        <el-form-item label="Description" prop="description">
          <el-input 
            v-model="prefixForm.description" 
            type="textarea" 
            placeholder="Optional description"
            :rows="3"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">Cancel</el-button>
        <el-button type="primary" @click="savePrefix" :loading="saving">
          {{ editingPrefix ? 'Update' : 'Create' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { prefixApi } from '../request/prefix'
import dayjs from 'dayjs'

// State
const prefixes = ref([])
const loading = ref(false)
const saving = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// Dialog state
const showCreateDialog = ref(false)
const editingPrefix = ref(null)
const prefixFormRef = ref()

const prefixForm = reactive({
  prefix: '',
  password: '',
  description: ''
})

const prefixRules = {
  prefix: [
    { required: true, message: 'Please enter prefix', trigger: 'blur' },
    { min: 1, max: 50, message: 'Prefix length should be 1-50 characters', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9._-]+$/, message: 'Prefix can only contain letters, numbers, dots, underscores, and hyphens', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Please enter password', trigger: 'blur' },
    { min: 6, message: 'Password should be at least 6 characters', trigger: 'blur' }
  ]
}

// Methods
const loadPrefixes = async (page = 1) => {
  try {
    loading.value = true
    const response = await prefixApi.listPrefixes({
      page,
      size: pageSize.value
    })
    
    if (response.code === 200) {
      prefixes.value = response.data.list || []
      total.value = response.data.total || 0
      currentPage.value = response.data.page || 1
    } else {
      ElMessage.error(response.message || 'Failed to load prefixes')
    }
  } catch (error) {
    console.error('Failed to load prefixes:', error)
    ElMessage.error('Failed to load prefixes')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page) => {
  loadPrefixes(page)
}

const resetForm = () => {
  prefixForm.prefix = ''
  prefixForm.password = ''
  prefixForm.description = ''
  editingPrefix.value = null
}

const editPrefix = (prefix) => {
  editingPrefix.value = prefix
  prefixForm.prefix = prefix.prefix
  prefixForm.password = '' // Don't show existing password
  prefixForm.description = prefix.description || ''
  showCreateDialog.value = true
}

const savePrefix = async () => {
  if (!prefixFormRef.value) return
  
  try {
    await prefixFormRef.value.validate()
    saving.value = true
    
    const action = editingPrefix.value ? 'update' : 'create'
    const response = await prefixApi.managePrefix({
      action,
      prefix: prefixForm.prefix.toLowerCase(),
      password: prefixForm.password,
      description: prefixForm.description
    })
    
    if (response.code === 200) {
      ElMessage.success(`Prefix ${action}d successfully`)
      showCreateDialog.value = false
      resetForm()
      loadPrefixes(currentPage.value)
    } else {
      ElMessage.error(response.message || `Failed to ${action} prefix`)
    }
  } catch (error) {
    console.error(`Failed to ${editingPrefix.value ? 'update' : 'create'} prefix:`, error)
    ElMessage.error(`Failed to ${editingPrefix.value ? 'update' : 'create'} prefix`)
  } finally {
    saving.value = false
  }
}

const togglePrefix = async (prefix) => {
  try {
    const action = prefix.isActive ? 'disable' : 'enable'
    await ElMessageBox.confirm(
      `Are you sure you want to ${action} prefix "${prefix.prefix}"?`,
      'Confirm',
      { type: 'warning' }
    )
    
    const response = await prefixApi.managePrefix({
      action: 'toggle',
      prefix: prefix.prefix
    })
    
    if (response.code === 200) {
      ElMessage.success(`Prefix ${action}d successfully`)
      loadPrefixes(currentPage.value)
    } else {
      ElMessage.error(response.message || `Failed to ${action} prefix`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to toggle prefix:', error)
      ElMessage.error('Failed to toggle prefix')
    }
  }
}

const deletePrefix = async (prefix) => {
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to delete prefix "${prefix.prefix}"? This action cannot be undone.`,
      'Confirm Delete',
      { type: 'error' }
    )
    
    const response = await prefixApi.deletePrefix({
      prefix: prefix.prefix
    })
    
    if (response.code === 200) {
      ElMessage.success('Prefix deleted successfully')
      loadPrefixes(currentPage.value)
    } else {
      ElMessage.error(response.message || 'Failed to delete prefix')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete prefix:', error)
      ElMessage.error('Failed to delete prefix')
    }
  }
}

const formatDate = (timestamp) => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

// Lifecycle
onMounted(() => {
  loadPrefixes()
})

// Watch dialog close
watch(() => showCreateDialog.value, (newVal) => {
  if (!newVal) {
    resetForm()
    if (prefixFormRef.value) {
      prefixFormRef.value.resetFields()
    }
  }
})
</script>

<style scoped>
.prefix-admin-container {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  color: #333;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-section {
  margin-top: 20px;
  text-align: center;
}

.form-help {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}
</style>