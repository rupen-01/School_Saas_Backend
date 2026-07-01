# Staff Settings API Documentation

## 🎯 Overview

This document describes the complete implementation of the **Staff Settings API** for the School SaaS Backend. The API provides comprehensive management of staff-related settings including departments, leave types, and leave policies with auto-approve functionality.

## 🏗️ Architecture

### **API Structure**
```
/settings/staff/
├── /overview                    - Get settings overview
├── /departments                 - Department management
├── /leave-types                 - Leave type management
└── /leave-policies             - Leave policy management
```

### **Database Structure**
- **Single Database, Multiple Schemas** approach
- Each school gets its own schema (tenant isolation)
- Common models in `public` schema
- Tenant-specific models in school-specific schemas

## 📊 Database Models

### **1. Department Model**
```sql
departments:
- id (UUID, Primary Key)
- name (STRING, Unique)
- description (TEXT)
- status (BOOLEAN)
- created_by (UUID)
- updated_by (UUID)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- deleted_at (TIMESTAMP)
- is_deleted (BOOLEAN)
```

### **2. Leave Type Model**
```sql
leave_types:
- id (UUID, Primary Key)
- name (STRING, Unique)
- description (TEXT)
- max_days (INTEGER)
- status (BOOLEAN)
- created_by (UUID)
- updated_by (UUID)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- deleted_at (TIMESTAMP)
- is_deleted (BOOLEAN)
```

### **3. Leave Policy Model**
```sql
leave_policies:
- id (UUID, Primary Key)
- name (STRING, Unique)
- description (TEXT)
- leave_type_id (UUID, Foreign Key)
- department_id (UUID, Foreign Key, Optional)
- max_days_per_year (INTEGER)
- auto_approve (BOOLEAN) - Main Feature
- approval_required (BOOLEAN)
- status (BOOLEAN)
- created_by (UUID)
- updated_by (UUID)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- deleted_at (TIMESTAMP)
- is_deleted (BOOLEAN)
```

## 🔐 Authentication & Authorization

### **JWT Token Structure**
```javascript
{
  id: user.id,
  role: user.role,
  schemaName: user.schemaName  // For multi-tenancy
}
```

### **Middleware Stack**
1. **verifyJWT** - Token verification
2. **tenantModelLoader** - Dynamic model loading for tenant schema

## 📋 API Endpoints

### **Settings Overview**
```
GET /settings/staff/overview
```
**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "departments": {
      "total": 5,
      "active": 4,
      "inactive": 1
    },
    "leave_types": {
      "total": 8,
      "active": 7,
      "inactive": 1
    },
    "leave_policies": {
      "total": 12,
      "auto_approve": 3,
      "manual_approve": 9
    },
    "recent_changes": [...]
  },
  "message": "Settings overview fetched successfully"
}
```

### **Department Management**

#### **Create Department**
```
POST /settings/staff/departments
```
**Request:**
```json
{
  "name": "Mathematics",
  "description": "Mathematics Department",
  "status": true
}
```

#### **Get All Departments**
```
GET /settings/staff/departments?include_deleted=false
```

#### **Get Department by ID**
```
GET /settings/staff/departments/:id
```

#### **Update Department**
```
PATCH /settings/staff/departments/:id
```

#### **Delete Department (Soft Delete)**
```
DELETE /settings/staff/departments/:id
```

#### **Restore Deleted Department**
```
PATCH /settings/staff/departments/:id/restore
```

### **Leave Type Management**

#### **Create Leave Type**
```
POST /settings/staff/leave-types
```
**Request:**
```json
{
  "name": "Medical Leave",
  "description": "Medical and health related leave",
  "max_days": 30,
  "status": true
}
```

#### **Get All Leave Types**
```
GET /settings/staff/leave-types?include_deleted=false
```

#### **Get Leave Type by ID**
```
GET /settings/staff/leave-types/:id
```

#### **Update Leave Type**
```
PATCH /settings/staff/leave-types/:id
```

#### **Delete Leave Type (Soft Delete)**
```
DELETE /settings/staff/leave-types/:id
```

#### **Restore Deleted Leave Type**
```
PATCH /settings/staff/leave-types/:id/restore
```

### **Leave Policy Management**

#### **Create Leave Policy**
```
POST /settings/staff/leave-policies
```
**Request:**
```json
{
  "name": "Standard Medical Policy",
  "description": "Standard medical leave policy",
  "leave_type_id": "uuid",
  "department_id": "uuid", // optional
  "max_days_per_year": 15,
  "auto_approve": true,
  "approval_required": false,
  "status": true
}
```

#### **Get All Leave Policies**
```
GET /settings/staff/leave-policies?include_deleted=false
```

#### **Get Leave Policy by ID**
```
GET /settings/staff/leave-policies/:id
```

#### **Update Leave Policy**
```
PATCH /settings/staff/leave-policies/:id
```

#### **Delete Leave Policy (Soft Delete)**
```
DELETE /settings/staff/leave-policies/:id
```

#### **Restore Deleted Leave Policy**
```
PATCH /settings/staff/leave-policies/:id/restore
```

## 🔄 Auto Approve Feature

### **How It Works**
- **auto_approve: true** - Leave requests are automatically approved
- **auto_approve: false** - Leave requests require manual approval
- **approval_required** - Complementary field for approval workflow

### **Use Cases**
1. **Casual Leave** - Auto approve for 1-2 days
2. **Medical Leave** - Manual approval required
3. **Department-specific** - Different policies per department

## 📁 File Structure

```
src/
├── model/tenant/
│   ├── department.model.js
│   ├── leaveType.model.js
│   └── leavePolicy.model.js
├── controller/settings/
│   └── staffSettings.controller.js
├── route/settings/
│   ├── index.js
│   └── staffSettings.route.js
└── middleware/
    └── tenantModelLoader.js
```

## 🛠️ Key Features

### **1. Multi-Tenant Architecture**
- Schema-based isolation
- Dynamic model loading
- Complete data separation

### **2. Audit Trail**
- Who created/updated what
- Change tracking with before/after values
- Complete history maintenance

### **3. Soft Delete**
- Data never lost
- Restore functionality
- Maintains referential integrity

### **4. Auto Approve System**
- Configurable approval workflow
- Department-specific policies
- Flexible leave management

### **5. Validation**
- Unique name constraints
- Foreign key validation
- Required field validation

## 🚀 Getting Started

### **1. Database Setup**
```bash
# Tables will be created automatically when school is created
# Each school gets its own schema with these tables
```

### **2. API Testing**
```bash
# Test with Postman or curl
curl -X POST http://localhost:5000/settings/staff/departments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mathematics",
    "description": "Mathematics Department",
    "status": true
  }'
```

### **3. Swagger Documentation**
```
http://localhost:5000/api-docs
```

## 📝 Response Format

### **Success Response**
```json
{
  "statusCode": 200,
  "data": {...},
  "message": "Operation successful"
}
```

### **Error Response**
```json
{
  "statusCode": 400,
  "data": null,
  "message": "Error description"
}
```

### **Change Tracking Response**
```json
{
  "statusCode": 200,
  "data": {
    "id": "uuid",
    "name": "Updated Name",
    "changes_made": {
      "name": {
        "from": "Old Name",
        "to": "Updated Name"
      }
    }
  },
  "message": "Updated successfully by user@email.com"
}
```

## 🔧 Configuration

### **Environment Variables**
```env
NODE_ENV=local
PORT=5000
DB_NAME=your_database
DB_USER=your_user
DB_PASS=your_password
DB_HOST=your_host
ACCESS_TOKEN_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_secret
```

## 🎯 Future Enhancements

1. **Bulk Operations** - Import/export departments
2. **Advanced Filtering** - Search and filter capabilities
3. **Notification System** - Email/SMS for policy changes
4. **Approval Workflow** - Multi-level approval chains
5. **Reporting** - Analytics and reports
6. **Integration** - Connect with leave application system

## 📞 Support

For any questions or issues, please refer to:
- API Documentation: `/api-docs`
- Database Schema: Check tenant models
- Authentication: JWT token required for all endpoints

---

**Note:** This API is designed for multi-tenant school management systems with complete data isolation and audit capabilities.
