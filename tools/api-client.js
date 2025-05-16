// API Client for Company Management System
// This script provides a simple client for interacting with the API

const axios = require('axios');
require('dotenv').config();

class CompanyAPIClient {
  constructor(baseURL = 'http://localhost:' + (process.env.PORT || 80)) {
    this.baseURL = baseURL;
    this.token = null;
    this.refreshToken = null;
  }

  // Authentication
  async login(email, password) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, { email, password });
      this.token = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  }

  async refreshAuthToken() {
    try {
      const response = await axios.post(`${this.baseURL}/auth/refresh-token`, { refreshToken: this.refreshToken });
      this.token = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      return response.data;
    } catch (error) {
      console.error('Token refresh error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Headers with authentication
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // Department operations
  async getDepartments() {
    try {
      const response = await axios.get(`${this.baseURL}/department`, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Get departments error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createDepartment(departmentData) {
    try {
      const response = await axios.post(`${this.baseURL}/department`, departmentData, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Create department error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Employee operations
  async getEmployees() {
    try {
      const response = await axios.get(`${this.baseURL}/emp`, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Get employees error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createEmployee(employeeData) {
    try {
      const response = await axios.post(`${this.baseURL}/emp`, employeeData, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Create employee error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Job title operations
  async getJobTitles() {
    try {
      const response = await axios.get(`${this.baseURL}/job-titles`, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Get job titles error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createJobTitle(jobTitleData) {
    try {
      const response = await axios.post(`${this.baseURL}/job-titles`, jobTitleData, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Create job title error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Project operations
  async getProjects() {
    try {
      const response = await axios.get(`${this.baseURL}/project`, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Get projects error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createProject(projectData) {
    try {
      const response = await axios.post(`${this.baseURL}/project`, projectData, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Create project error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Task operations
  async getTasks() {
    try {
      const response = await axios.get(`${this.baseURL}/task`, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Get tasks error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createTask(taskData) {
    try {
      const response = await axios.post(`${this.baseURL}/task`, taskData, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Create task error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Dashboard operations
  async getDashboardStats() {
    try {
      const response = await axios.get(`${this.baseURL}/dashboard`, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Get dashboard stats error:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Example usage
async function main() {
  const client = new CompanyAPIClient();
  
  try {
    // Login as admin
    await client.login('admin@example.com', 'Admin@123');
    console.log('Logged in successfully');
    
    // Get dashboard statistics
    const dashboardStats = await client.getDashboardStats();
    console.log('Dashboard Statistics:', dashboardStats);
    
    // Get all departments
    const departments = await client.getDepartments();
    console.log('Departments:', departments);
    
    // Get all employees
    const employees = await client.getEmployees();
    console.log('Employees:', employees);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = CompanyAPIClient;
