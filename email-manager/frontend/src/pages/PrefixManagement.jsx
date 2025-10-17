import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function PrefixManagement() {
  const [prefixes, setPrefixes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    prefix: '',
    description: '',
    accessPassword: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadPrefixes();
  }, []);

  const loadPrefixes = async () => {
    try {
      const response = await api.getPrefixes();
      setPrefixes(response.data);
    } catch (err) {
      setError('Failed to load prefixes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        await api.updatePrefix(editingId, {
          description: formData.description,
          access_password: formData.accessPassword || undefined,
        });
      } else {
        await api.createPrefix(
          formData.prefix,
          formData.description,
          formData.accessPassword
        );
      }
      
      await loadPrefixes();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save prefix');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this prefix?')) {
      return;
    }

    try {
      await api.deletePrefix(id);
      await loadPrefixes();
    } catch (err) {
      setError('Failed to delete prefix');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await api.updatePrefix(id, { is_active: !currentStatus });
      await loadPrefixes();
    } catch (err) {
      setError('Failed to update prefix status');
    }
  };

  const startEdit = (prefix) => {
    setEditingId(prefix.id);
    setFormData({
      prefix: prefix.prefix,
      description: prefix.description || '',
      accessPassword: '',
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({ prefix: '', description: '', accessPassword: '' });
    setShowAddForm(false);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Email Prefix Management</h2>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Prefix
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {showAddForm && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prefix</label>
                  <input
                    type="text"
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toLowerCase() })}
                    disabled={editingId}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                    placeholder="e.g., support"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Optional description"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Access Password {editingId && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    value={formData.accessPassword}
                    onChange={(e) => setFormData({ ...formData, accessPassword: e.target.value })}
                    required={!editingId}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Password for accessing emails"
                  />
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prefix
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {prefixes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No prefixes created yet
                  </td>
                </tr>
              ) : (
                prefixes.map((prefix) => (
                  <tr key={prefix.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <KeyIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{prefix.prefix}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {prefix.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(prefix.id, prefix.is_active)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          prefix.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {prefix.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(prefix.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => startEdit(prefix)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(prefix.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}