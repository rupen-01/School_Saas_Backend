# Master Data API Documentation

## Overview
The Master Data API provides endpoints for managing core school data that can be reused across academic years. This includes Class Masters, Section Masters, Subject Masters, and House Masters.

## Base URL
All endpoints are prefixed with: `/school/settings/masterdata/`

## Authentication
All endpoints require JWT authentication and tenant model loading middleware.

## API Endpoints

### Class Master

#### Create Class Master
- **POST** `/classes`
- **Description**: Creates a new class master entry
- **Required Fields**: `class_name`
- **Optional Fields**: `class_code`, `display_order`, `description`, `is_active`

#### Get All Class Masters
- **GET** `/classes`
- **Query Parameters**: 
  - `include_deleted` (boolean, default: false)
  - `is_active` (boolean)

#### Get Class Master by ID
- **GET** `/classes/{id}`

#### Update Class Master
- **PUT** `/classes/{id}`
- **Optional Fields**: `class_name`, `class_code`, `display_order`, `description`, `is_active`

#### Delete Class Master
- **DELETE** `/classes/{id}`
- **Description**: Soft deletes the class master

#### Restore Class Master
- **PUT** `/classes/{id}/restore`
- **Description**: Restores a soft-deleted class master

### Section Master

#### Create Section Master
- **POST** `/sections`
- **Description**: Creates a new section master entry
- **Required Fields**: `section_name`
- **Optional Fields**: `section_code`, `display_order`, `description`, `is_active`

#### Get All Section Masters
- **GET** `/sections`
- **Query Parameters**: 
  - `include_deleted` (boolean, default: false)
  - `is_active` (boolean)

#### Get Section Master by ID
- **GET** `/sections/{id}`

#### Update Section Master
- **PUT** `/sections/{id}`
- **Optional Fields**: `section_name`, `section_code`, `display_order`, `description`, `is_active`

#### Delete Section Master
- **DELETE** `/sections/{id}`
- **Description**: Soft deletes the section master

#### Restore Section Master
- **PUT** `/sections/{id}/restore`
- **Description**: Restores a soft-deleted section master

### Subject Master

#### Create Subject Master
- **POST** `/subjects`
- **Description**: Creates a new subject master entry
- **Required Fields**: `subject_name`
- **Optional Fields**: `subject_code`, `subject_type`, `display_order`, `description`, `is_active`
- **Subject Types**: `academic`, `co-curricular`, `extra-curricular`, `sports`, `other`

#### Get All Subject Masters
- **GET** `/subjects`
- **Query Parameters**: 
  - `include_deleted` (boolean, default: false)
  - `is_active` (boolean)
  - `subject_type` (string)

#### Get Subject Master by ID
- **GET** `/subjects/{id}`

#### Update Subject Master
- **PUT** `/subjects/{id}`
- **Optional Fields**: `subject_name`, `subject_code`, `subject_type`, `display_order`, `description`, `is_active`

#### Delete Subject Master
- **DELETE** `/subjects/{id}`
- **Description**: Soft deletes the subject master

#### Restore Subject Master
- **PUT** `/subjects/{id}/restore`
- **Description**: Restores a soft-deleted subject master

### House Master

#### Create House Master
- **POST** `/houses`
- **Description**: Creates a new house master entry
- **Required Fields**: `house_name`
- **Optional Fields**: `house_code`, `house_color`, `display_order`, `description`, `is_active`

#### Get All House Masters
- **GET** `/houses`
- **Query Parameters**: 
  - `include_deleted` (boolean, default: false)
  - `is_active` (boolean)

#### Get House Master by ID
- **GET** `/houses/{id}`

#### Update House Master
- **PUT** `/houses/{id}`
- **Optional Fields**: `house_name`, `house_code`, `house_color`, `display_order`, `description`, `is_active`

#### Delete House Master
- **DELETE** `/houses/{id}`
- **Description**: Soft deletes the house master

#### Restore House Master
- **PUT** `/houses/{id}/restore`
- **Description**: Restores a soft-deleted house master

## Data Models

### Class Master
```json
{
  "id": "uuid",
  "class_name": "string (required)",
  "class_code": "string (optional)",
  "display_order": "integer (default: 0)",
  "description": "string (optional)",
  "is_active": "boolean (default: true)",
  "created_by": "uuid",
  "updated_by": "uuid",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "deleted_at": "datetime (nullable)",
  "is_deleted": "boolean (default: false)"
}
```

### Section Master
```json
{
  "id": "uuid",
  "section_name": "string (required)",
  "section_code": "string (optional)",
  "display_order": "integer (default: 0)",
  "description": "string (optional)",
  "is_active": "boolean (default: true)",
  "created_by": "uuid",
  "updated_by": "uuid",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "deleted_at": "datetime (nullable)",
  "is_deleted": "boolean (default: false)"
}
```

### Subject Master
```json
{
  "id": "uuid",
  "subject_name": "string (required)",
  "subject_code": "string (optional)",
  "subject_type": "enum (academic|co-curricular|extra-curricular|sports|other, default: academic)",
  "display_order": "integer (default: 0)",
  "description": "string (optional)",
  "is_active": "boolean (default: true)",
  "created_by": "uuid",
  "updated_by": "uuid",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "deleted_at": "datetime (nullable)",
  "is_deleted": "boolean (default: false)"
}
```

### House Master
```json
{
  "id": "uuid",
  "house_name": "string (required)",
  "house_code": "string (optional)",
  "house_color": "string (optional, hex color)",
  "display_order": "integer (default: 0)",
  "description": "string (optional)",
  "is_active": "boolean (default: true)",
  "created_by": "uuid",
  "updated_by": "uuid",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "deleted_at": "datetime (nullable)",
  "is_deleted": "boolean (default: false)"
}
```

## Features

### Schema Isolation
- Each school has its own database schema (e.g., `khushi-global-school-202509101717`)
- Data is automatically isolated by schema
- No need to use `school_id` in any table

### Soft Delete
- All master data supports soft delete functionality
- Deleted records can be restored using the restore endpoints
- Soft deleted records are excluded from normal queries unless `include_deleted=true`

### Validation
- Unique constraints on names and codes (case-insensitive)
- Required field validation
- Proper error messages for validation failures

### Audit Trail
- All records track `created_by` and `updated_by`
- Timestamps for creation and updates
- Change tracking in update responses

## Example Usage

### Create a Class Master
```bash
POST /school/settings/masterdata/classes
Content-Type: application/json

{
  "class_name": "1st",
  "class_code": "C1",
  "display_order": 1,
  "description": "First grade class",
  "is_active": true
}
```

### Get All Active Classes
```bash
GET /school/settings/masterdata/classes?is_active=true
```

### Create a Subject Master
```bash
POST /school/settings/masterdata/subjects
Content-Type: application/json

{
  "subject_name": "Mathematics",
  "subject_code": "MATH",
  "subject_type": "academic",
  "display_order": 1,
  "description": "Mathematics subject",
  "is_active": true
}
```

## Benefits

1. **Reusability**: Master data can be used across multiple academic years
2. **Consistency**: Standardized data structure across the school
3. **Efficiency**: Bulk operations and templates for quick setup
4. **Flexibility**: Easy to add new master data types
5. **Data Integrity**: Proper validation and constraints
6. **Audit Trail**: Complete tracking of changes and deletions

## Future Enhancements

- Bulk import/export functionality
- Template-based setup for new schools
- Copy from previous academic year
- Auto-generation of sections based on student count
- Fee escalation rules
- Integration with other modules (students, teachers, etc.)
