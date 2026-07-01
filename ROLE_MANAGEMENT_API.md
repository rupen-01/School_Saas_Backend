# Role Management System - Complete Documentation

## 📋 Overview

A comprehensive **Role-Based Access Control (RBAC)** system for multi-tenant School SaaS application with granular permission management at module and sub-module levels.

---

## 🏗️ Architecture

### **Database Models**

#### **1. role_master** (Tenant-specific)
```sql
CREATE TABLE role_master (
  id UUID PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL,
  role_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**System Roles** (Pre-defined, cannot be deleted):
- Principal
- Vice Principal
- Teacher
- Admin Officer
- Accountant
- Librarian

#### **2. role_module_permissions** (Tenant-specific)
```sql
CREATE TABLE role_module_permissions (
  id UUID PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES role_master(id) ON DELETE CASCADE,
  module_id UUID NOT NULL, -- References Module in common schema
  sub_module_id UUID, -- NULL for module-level, References SubModule in common schema
  can_view BOOLEAN DEFAULT FALSE,
  can_create BOOLEAN DEFAULT FALSE,
  can_update BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_export BOOLEAN DEFAULT FALSE,
  can_approve BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(role_id, module_id, sub_module_id) WHERE is_deleted = FALSE
);
```

---

## 🔌 API Endpoints

### **Base URL:** `/settings/roles`

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 1 | POST | `/settings/roles` | Create new role |
| 2 | GET | `/settings/roles` | Get all roles with pagination |
| 3 | GET | `/settings/roles/:id` | Get role by ID with permissions |
| 4 | PUT | `/settings/roles/:id` | Update role details |
| 5 | DELETE | `/settings/roles/:id` | Soft delete role |
| 6 | PUT | `/settings/roles/:id/restore` | Restore deleted role |
| 7 | DELETE | `/settings/roles/:id/permanent-delete` | Permanently delete role |
| 8 | PUT | `/settings/roles/:id/toggle-status` | Activate/Deactivate role |
| 9 | POST | `/settings/roles/:id/clone` | Clone role with permissions |
| 10 | PUT | `/settings/roles/:roleId/permissions` | Assign/Update permissions |
| 11 | GET | `/settings/roles/available-modules` | Get subscribed modules |

---

## 📝 API Request/Response Examples

### **1. Create Role**

**Request:**
```http
POST /settings/roles
Authorization: Bearer <token>
Content-Type: application/json

{
  "role_name": "Class Teacher",
  "role_code": "CLASS_TEACHER",
  "description": "Teacher responsible for managing a specific class"
}
```

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "role_name": "Class Teacher",
    "role_code": "CLASS_TEACHER",
    "description": "Teacher responsible for managing a specific class",
    "is_system_role": false,
    "is_active": true,
    "created_by": "user-uuid",
    "updated_by": "user-uuid",
    "createdAt": "2024-11-02T10:30:00Z",
    "updatedAt": "2024-11-02T10:30:00Z"
  },
  "message": "Role created successfully",
  "success": true
}
```

---

### **2. Assign Permissions to Role**

**Request:**
```http
PUT /settings/roles/550e8400-e29b-41d4-a716-446655440000/permissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "permissions": [
    {
      "module_id": "module-uuid-1",
      "module_permissions": {
        "can_view": true,
        "can_create": true,
        "can_update": true,
        "can_delete": false,
        "can_export": false,
        "can_approve": false
      },
      "sub_module_permissions": [
        {
          "sub_module_id": "submod-uuid-1a",
          "permissions": {
            "can_view": true,
            "can_create": true,
            "can_update": true,
            "can_delete": true,
            "can_export": true,
            "can_approve": false
          }
        },
        {
          "sub_module_id": "submod-uuid-1b",
          "permissions": {
            "can_view": true,
            "can_create": false,
            "can_update": true,
            "can_delete": false,
            "can_export": false,
            "can_approve": false
          }
        }
      ]
    },
    {
      "module_id": "module-uuid-2",
      "module_permissions": {
        "can_view": true,
        "can_create": true,
        "can_update": false,
        "can_delete": false,
        "can_export": false,
        "can_approve": false
      },
      "sub_module_permissions": []
    }
  ]
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "role_id": "550e8400-e29b-41d4-a716-446655440000",
    "role_name": "Class Teacher",
    "total_permissions_assigned": 5,
    "modules_configured": 2
  },
  "message": "Permissions assigned successfully",
  "success": true
}
```

---

### **3. Get Role with Permissions**

**Request:**
```http
GET /settings/roles/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "role_name": "Class Teacher",
    "role_code": "CLASS_TEACHER",
    "description": "Teacher responsible for managing a specific class",
    "is_system_role": false,
    "is_active": true,
    "permissions": [
      {
        "module_id": "module-uuid-1",
        "module_name": "Student Management",
        "module_icon": "users",
        "module_permissions": {
          "can_view": true,
          "can_create": true,
          "can_update": true,
          "can_delete": false,
          "can_export": false,
          "can_approve": false
        },
        "sub_modules": [
          {
            "sub_module_id": "submod-uuid-1a",
            "sub_module_name": "Student Registration",
            "permissions": {
              "can_view": true,
              "can_create": true,
              "can_update": true,
              "can_delete": true,
              "can_export": true,
              "can_approve": false
            }
          },
          {
            "sub_module_id": "submod-uuid-1b",
            "sub_module_name": "Student Profile",
            "permissions": {
              "can_view": true,
              "can_create": false,
              "can_update": true,
              "can_delete": false,
              "can_export": false,
              "can_approve": false
            }
          }
        ]
      },
      {
        "module_id": "module-uuid-2",
        "module_name": "Attendance",
        "module_icon": "calendar-check",
        "module_permissions": {
          "can_view": true,
          "can_create": true,
          "can_update": false,
          "can_delete": false,
          "can_export": true,
          "can_approve": false
        },
        "sub_modules": []
      }
    ],
    "createdAt": "2024-11-02T10:30:00Z",
    "updatedAt": "2024-11-02T10:30:00Z"
  },
  "message": "Role retrieved successfully",
  "success": true
}
```

---

### **4. Get All Roles with Pagination**

**Request:**
```http
GET /settings/roles?page=1&limit=10&is_active=true&search=teacher
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "roles": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "role_name": "Class Teacher",
        "role_code": "CLASS_TEACHER",
        "description": "Teacher responsible for managing a specific class",
        "is_system_role": false,
        "is_active": true,
        "createdAt": "2024-11-02T10:30:00Z",
        "updatedAt": "2024-11-02T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25,
      "itemsPerPage": 10,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "message": "Roles retrieved successfully",
  "success": true
}
```

---

### **5. Soft Delete Role**

**Request:**
```http
DELETE /settings/roles/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "data": null,
  "message": "Role deleted successfully",
  "success": true
}
```

**Note:** Soft-deleted roles can be restored within 90 days.

---

### **6. Restore Deleted Role**

**Request:**
```http
PUT /settings/roles/550e8400-e29b-41d4-a716-446655440000/restore
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "role_name": "Class Teacher",
    "role_code": "CLASS_TEACHER",
    "is_deleted": false,
    "deleted_at": null
  },
  "message": "Role restored successfully",
  "success": true
}
```

---

### **7. Permanent Delete Role**

**Request:**
```http
DELETE /settings/roles/550e8400-e29b-41d4-a716-446655440000/permanent-delete
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "data": null,
  "message": "Role permanently deleted successfully",
  "success": true
}
```

**⚠️ Warning:** This action is **irreversible**. All associated permissions will be permanently deleted.

---

### **8. Clone Role**

**Request:**
```http
POST /settings/roles/550e8400-e29b-41d4-a716-446655440000/clone
Authorization: Bearer <token>
Content-Type: application/json

{
  "new_role_name": "Junior Class Teacher",
  "new_role_code": "JUNIOR_CLASS_TEACHER",
  "description": "Junior teacher with limited responsibilities",
  "copy_permissions": true
}
```

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "id": "new-role-uuid",
    "role_name": "Junior Class Teacher",
    "role_code": "JUNIOR_CLASS_TEACHER",
    "description": "Junior teacher with limited responsibilities",
    "is_system_role": false,
    "is_active": true,
    "cloned_from": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "role_name": "Class Teacher"
    },
    "permissions_copied": 15
  },
  "message": "Role cloned successfully with 15 permission(s)",
  "success": true
}
```

---

### **9. Get Available Modules**

**Request:**
```http
GET /settings/roles/available-modules
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "modules": [
      {
        "module_id": "module-uuid-1",
        "module_name": "Student Management",
        "module_icon": "users",
        "is_subscribed": true,
        "sub_modules": [
          {
            "sub_module_id": "submod-uuid-1a",
            "sub_module_name": "Student Registration"
          },
          {
            "sub_module_id": "submod-uuid-1b",
            "sub_module_name": "Student Profile"
          }
        ]
      },
      {
        "module_id": "module-uuid-2",
        "module_name": "Attendance Management",
        "module_icon": "calendar-check",
        "is_subscribed": true,
        "sub_modules": []
      }
    ]
  },
  "message": "Available modules retrieved successfully",
  "success": true
}
```

---

## 🔒 Permission Check Middleware (For Future Use)

```javascript
// middleware/checkPermission.js
import { ApiError } from "../utils/apiError.js";
import asynchandler from "../utils/asyncHandler.js";

export const checkPermission = (moduleName, permission = 'can_view') => {
  return asynchandler(async (req, res, next) => {
    const userId = req.user.id;
    const { Staff, RoleMaster, RoleModulePermissions } = req.tenantModels;
    const { Module } = req.app.locals.models;
    
    // Get module by name
    const module = await Module.findOne({
      where: { name: moduleName },
      attributes: ['id']
    });
    
    if (!module) {
      throw new ApiError(404, "Module not found");
    }
    
    // Get staff with role and permissions
    const staff = await Staff.findOne({
      where: { user_id: userId, is_deleted: false },
      include: [{
        model: RoleMaster,
        as: 'role',
        where: { is_active: true, is_deleted: false },
        include: [{
          model: RoleModulePermissions,
          as: 'permissions',
          where: { 
            module_id: module.id,
            is_deleted: false
          },
          required: false
        }]
      }]
    });
    
    if (!staff || !staff.role) {
      throw new ApiError(403, "Access denied: No role assigned");
    }
    
    // Check if has permission
    const hasPermission = staff.role.permissions.some(p => p[permission] === true);
    
    if (!hasPermission) {
      throw new ApiError(403, `Access denied: Insufficient permissions (${permission})`);
    }
    
    // Attach staff and permissions to request
    req.staff = staff;
    req.permissions = staff.role.permissions;
    
    next();
  });
};

// Usage in routes:
router.post('/students', 
  verifyJWT, 
  tenantModelLoader, 
  checkPermission('Student Management', 'can_create'),
  createStudent
);

router.get('/students/:id', 
  verifyJWT, 
  tenantModelLoader, 
  checkPermission('Student Management', 'can_view'),
  getStudentById
);
```

---

## ⚡ Performance Optimizations

### **1. Efficient Query Patterns**
- Uses `attributes` to fetch only required fields
- `raw: true` for plain objects when Sequelize instances not needed
- Batch queries with `Promise.all()` for parallel execution
- Lookup Maps (`Map`) for O(1) access instead of nested loops

### **2. Indexing Strategy**
```sql
-- Composite unique index
CREATE UNIQUE INDEX role_perm_unique_idx ON role_module_permissions(role_id, module_id, sub_module_id) WHERE is_deleted = FALSE;

-- Individual indexes
CREATE INDEX role_perm_role_idx ON role_module_permissions(role_id);
CREATE INDEX role_perm_module_idx ON role_module_permissions(module_id);
CREATE INDEX role_perm_role_deleted_idx ON role_module_permissions(role_id, is_deleted);
```

### **3. Bulk Operations**
- `bulkCreate()` for inserting multiple permissions
- Transaction support for atomic operations
- Soft delete with `update()` instead of individual deletes

### **4. Cloud Cost Optimization**
- Minimized database round trips
- Efficient pagination with offset/limit
- Only fetch subscribed modules (not all modules)
- Caching-friendly with proper indexes

---

## 🛡️ Security Features

1. **Soft Delete:** 90-day retention period for recovery
2. **System Role Protection:** Cannot delete/modify system roles
3. **UUID Validation:** Prevents injection attacks
4. **Transaction Support:** Atomic operations for data consistency
5. **Audit Trail:** Tracks created_by, updated_by for all changes
6. **Role Code Uniqueness:** Prevents duplicate roles per tenant
7. **Staff Assignment Check:** Cannot delete roles with active staff

---

## 📊 Validation Rules

### **Role Name:**
- Required
- 3-100 characters
- Trimmed whitespace

### **Role Code:**
- Required
- 2-50 characters
- Uppercase letters and underscores only
- Pattern: `^[A-Z_]+$`
- Examples: `CLASS_TEACHER`, `ADMIN_OFFICER`

### **Permissions:**
- All boolean fields required (`can_view`, `can_create`, etc.)
- `module_id` required (UUID format)
- `sub_module_id` optional (UUID or null)

---

## 🚀 Future Enhancements

1. **Staff Model Integration:**
   - Add `role_id` foreign key to Staff model
   - Implement staff-role assignment APIs
   - Prevent role deletion if staff assigned

2. **Advanced Permissions:**
   - Time-based access (office hours only)
   - Data-level permissions (own class only)
   - Approval workflows with limits
   - IP-based restrictions

3. **Permission Templates:**
   - Pre-configured permission sets
   - Quick role setup for common scenarios

4. **Audit Logging:**
   - Track all permission changes
   - Activity logs for compliance

5. **Role Hierarchy:**
   - Parent-child role relationships
   - Permission inheritance

---

## 📚 Related Documentation

- [Academic Year API Documentation](./ACADEMIC_YEAR_API.md)
- [Master Data API Documentation](./MASTER_DATA_API.md)
- [Staff Settings API Documentation](./STAFF_SETTINGS_API.md)

---

## 🧪 Testing Checklist

- [ ] Create role with valid data
- [ ] Create role with duplicate code (should fail)
- [ ] Update role (system role name modification should fail)
- [ ] Assign permissions to role
- [ ] Get role with permissions
- [ ] Soft delete role
- [ ] Restore deleted role (within 90 days)
- [ ] Restore deleted role (after 90 days - should fail)
- [ ] Permanent delete role
- [ ] Clone role with permissions
- [ ] Toggle role status
- [ ] Get available modules
- [ ] Pagination and search functionality
- [ ] System role protection

---

## 📞 Support

For issues or questions, contact the development team.

**Version:** 1.0.0  
**Last Updated:** November 2, 2024

