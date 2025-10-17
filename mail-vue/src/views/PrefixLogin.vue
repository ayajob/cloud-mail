<template>
  <div class="prefix-login-container">
    <div class="login-card">
      <div class="logo-section">
        <h1>📧 Prefix Email Access</h1>
        <p>Enter your prefix and access password to view emails</p>
      </div>
      
      <el-form 
        :model="loginForm" 
        :rules="rules" 
        ref="loginFormRef"
        @submit.prevent="handleLogin"
        class="login-form"
      >
        <el-form-item prop="prefix">
          <el-input
            v-model="loginForm.prefix"
            placeholder="Email prefix (e.g., 'test' for test@domain.com)"
            size="large"
            prefix-icon="User"
            :disabled="loading"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="Access password"
            size="large"
            prefix-icon="Lock"
            :disabled="loading"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            size="large" 
            :loading="loading"
            @click="handleLogin"
            class="login-button"
          >
            {{ loading ? 'Authenticating...' : 'Access Emails' }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="info-section">
        <el-alert
          title="How it works"
          type="info"
          :closable="false"
          show-icon
        >
          <p>This system uses prefix-based email filtering. Enter the prefix part of your email address and the corresponding access password to view emails sent to addresses starting with that prefix.</p>
        </el-alert>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { prefixApi } from '../request/prefix'

const router = useRouter()
const loginFormRef = ref()
const loading = ref(false)

const loginForm = reactive({
  prefix: '',
  password: ''
})

const rules = {
  prefix: [
    { required: true, message: 'Please enter email prefix', trigger: 'blur' },
    { min: 1, max: 50, message: 'Prefix length should be 1-50 characters', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Please enter access password', trigger: 'blur' },
    { min: 1, message: 'Password cannot be empty', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    await loginFormRef.value.validate()
    loading.value = true
    
    // Test authentication by getting stats
    const response = await prefixApi.getStats({
      prefix: loginForm.prefix.toLowerCase(),
      password: loginForm.password
    })
    
    if (response.code === 200) {
      // Store credentials in sessionStorage for this session
      sessionStorage.setItem('prefix_auth', JSON.stringify({
        prefix: loginForm.prefix.toLowerCase(),
        password: loginForm.password
      }))
      
      ElMessage.success('Authentication successful!')
      
      // Navigate to email list
      router.push('/prefix-emails')
    } else {
      ElMessage.error(response.message || 'Authentication failed')
    }
  } catch (error) {
    console.error('Login error:', error)
    ElMessage.error(error.message || 'Authentication failed')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.prefix-login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 450px;
}

.logo-section {
  text-align: center;
  margin-bottom: 30px;
}

.logo-section h1 {
  color: #333;
  margin-bottom: 10px;
  font-size: 28px;
}

.logo-section p {
  color: #666;
  margin: 0;
}

.login-form {
  margin-bottom: 20px;
}

.login-button {
  width: 100%;
  height: 50px;
  font-size: 16px;
}

.info-section {
  margin-top: 20px;
}

.info-section :deep(.el-alert__content) {
  font-size: 14px;
  line-height: 1.5;
}
</style>