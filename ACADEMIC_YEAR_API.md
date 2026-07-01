# Academic Year Management API Documentation

## Overview
This document describes the Academic Year management APIs for school settings. These APIs allow schools to manage their academic years with proper validation to ensure only one academic year can be active at a time.

## Base URL
All endpoints are prefixed with: `/api/settings/academic-year`

## Authentication
All endpoints require authentication. Include the access token in the request headers or cookies.

## Models

### Academic Year Model
```javascript
{
  id: UUID (Primary Key)
  school_id: UUID (Foreign Key to schools table)
  academic_year_label: String (Unique, e.g., "2024-2025")
  start_date: Date (YYYY-MM-DD format)
  end_date: Date (YYYY-MM-DD format)
  is_active: Boolean (Only one can be true at a time)
  description: String (Optional)
  created_by: UUID
  updated_by: UUID
  created_at: DateTime
  updated_at: DateTime
  deleted_at: DateTime (Soft delete)
  is_deleted: Boolean
}
```

## API Endpoints

### 1. Create Academic Year
**POST** `/api/settings/academic-year`

Creates a new academic year. If `is_active` is set to true, all other academic years will be deactivated.

#### Request Body
```json
{
  "academic_year_label": "2024-2025",
  "start_date": "2024-04-01",
  "end_date": "2025-03-31",
  "description": "Academic year 2024-2025",
  "is_active": false
}
```

#### Response
```json
{
  "statusCode": 201,
  "data": {
    "id": "uuid",
    "school_id": "uuid",
    "academic_year_label": "2024-2025",
    "start_date": "2024-04-01",
    "end_date": "2025-03-31",
    "description": "Academic year 2024-2025",
    "is_active": false,
    "created_by": "uuid",
    "updated_by": "uuid",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Academic year '2024-2025' created successfully by admin@school.com"
}
```

### 2. Get All Academic Years
**GET** `/api/settings/academic-year`

Retrieves all academic years with optional filtering.

#### Query Parameters
- `include_deleted` (boolean, optional): Include soft-deleted records (default: false)
- `is_active` (boolean, optional): Filter by active status

#### Example Request
```
GET /api/settings/academic-year?is_active=true
```

#### Response
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": "uuid",
      "school_id": "uuid",
      "academic_year_label": "2024-2025",
      "start_date": "2024-04-01",
      "end_date": "2025-03-31",
      "description": "Academic year 2024-2025",
      "is_active": true,
      "created_by": "uuid",
      "updated_by": "uuid",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Academic years fetched successfully"
}
```

### 3. Get Academic Year by ID
**GET** `/api/settings/academic-year/:id`

Retrieves a specific academic year by its ID.

#### Response
```json
{
  "statusCode": 200,
  "data": {
    "id": "uuid",
    "school_id": "uuid",
    "academic_year_label": "2024-2025",
    "start_date": "2024-04-01",
    "end_date": "2025-03-31",
    "description": "Academic year 2024-2025",
    "is_active": true,
    "created_by": "uuid",
    "updated_by": "uuid",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Academic year fetched successfully"
}
```

### 4. Update Academic Year
**PUT** `/api/settings/academic-year/:id`

Updates an existing academic year. If `is_active` is set to true, all other academic years will be deactivated.

#### Request Body
```json
{
  "academic_year_label": "2024-2025 Updated",
  "start_date": "2024-04-01",
  "end_date": "2025-03-31",
  "description": "Updated academic year description",
  "is_active": true
}
```

#### Response
```json
{
  "statusCode": 200,
  "data": {
    "id": "uuid",
    "school_id": "uuid",
    "academic_year_label": "2024-2025 Updated",
    "start_date": "2024-04-01",
    "end_date": "2025-03-31",
    "description": "Updated academic year description",
    "is_active": true,
    "created_by": "uuid",
    "updated_by": "uuid",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "changes_made": {
      "academic_year_label": {
        "from": "2024-2025",
        "to": "2024-2025 Updated"
      },
      "description": {
        "from": "Academic year 2024-2025",
        "to": "Updated academic year description"
      },
      "is_active": {
        "from": false,
        "to": true
      }
    }
  },
  "message": "Academic year updated successfully by admin@school.com"
}
```

### 5. Delete Academic Year
**DELETE** `/api/settings/academic-year/:id`

Soft deletes an academic year. Cannot delete an active academic year.

#### Response
```json
{
  "statusCode": 200,
  "data": {
    "id": "uuid",
    "academic_year_label": "2024-2025",
    "deleted_by": "uuid",
    "deleted_by_name": "admin@school.com",
    "deleted_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Academic year '2024-2025' deleted successfully by admin@school.com"
}
```

### 6. Restore Academic Year
**PUT** `/api/settings/academic-year/:id/restore`

Restores a soft-deleted academic year.

#### Response
```json
{
  "statusCode": 200,
  "data": {
    "id": "uuid",
    "academic_year_label": "2024-2025",
    "restored_by": "uuid",
    "restored_by_name": "admin@school.com",
    "restored_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Academic year '2024-2025' restored successfully by admin@school.com"
}
```

### 7. Activate Academic Year
**PUT** `/api/settings/academic-year/:id/activate`

Activates a specific academic year and deactivates all others.

#### Response
```json
{
  "statusCode": 200,
  "data": {
    "id": "uuid",
    "school_id": "uuid",
    "academic_year_label": "2024-2025",
    "start_date": "2024-04-01",
    "end_date": "2025-03-31",
    "description": "Academic year 2024-2025",
    "is_active": true,
    "created_by": "uuid",
    "updated_by": "uuid",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Academic year '2024-2025' activated successfully by admin@school.com"
}
```

### 8. Get Active Academic Year
**GET** `/api/settings/academic-year/active`

Retrieves the currently active academic year.

#### Response
```json
{
  "statusCode": 200,
  "data": {
    "id": "uuid",
    "school_id": "uuid",
    "academic_year_label": "2024-2025",
    "start_date": "2024-04-01",
    "end_date": "2025-03-31",
    "description": "Academic year 2024-2025",
    "is_active": true,
    "created_by": "uuid",
    "updated_by": "uuid",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Active academic year fetched successfully"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Academic year label, start date, and end date are required"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Academic year not found"
}
```

### 400 Validation Error
```json
{
  "statusCode": 400,
  "message": "End date must be after start date"
}
```

### 400 Duplicate Error
```json
{
  "statusCode": 400,
  "message": "Academic year with this label already exists"
}
```

### 400 Active Year Error
```json
{
  "statusCode": 400,
  "message": "Cannot delete active academic year. Please activate another academic year first."
}
```

## Business Rules

1. **Single Active Year**: Only one academic year can be active at a time per school.
2. **Date Validation**: End date must be after start date.
3. **Unique Labels**: Academic year labels must be unique within a school.
4. **Soft Delete**: Academic years are soft deleted, not permanently removed.
5. **Active Year Protection**: Active academic years cannot be deleted.
6. **Auto Deactivation**: When activating a new academic year, all others are automatically deactivated.

## Usage Examples

### Creating the First Academic Year
```bash
curl -X POST /api/settings/academic-year \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "academic_year_label": "2024-2025",
    "start_date": "2024-04-01",
    "end_date": "2025-03-31",
    "description": "Academic year 2024-2025",
    "is_active": true
  }'
```

### Switching Active Academic Year
```bash
curl -X PUT /api/settings/academic-year/ACADEMIC_YEAR_ID/activate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Getting All Active Academic Years
```bash
curl -X GET /api/settings/academic-year?is_active=true \
  -H "Authorization: Bearer YOUR_TOKEN"
```




