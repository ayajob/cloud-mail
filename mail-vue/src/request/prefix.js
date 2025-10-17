import axios from '../axios'

export const prefixApi = {
  // Get emails for a prefix
  getEmails(params) {
    return axios.post('/prefix/emails', params)
  },

  // Get email detail
  getEmailDetail(params) {
    return axios.post('/prefix/email/detail', params)
  },

  // Mark email as read
  markAsRead(params) {
    return axios.post('/prefix/email/read', params)
  },

  // Get prefix statistics
  getStats(params) {
    return axios.post('/prefix/stats', params)
  },

  // Admin functions
  managePrefix(params) {
    return axios.post('/prefix/manage', params)
  },

  listPrefixes(params) {
    return axios.get('/prefix/list', { params })
  },

  deletePrefix(params) {
    return axios.delete('/prefix/delete', { params })
  }
}