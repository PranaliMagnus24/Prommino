# Prominno

## API Documentation

This Laravel application provides APIs for Admin and Seller functionalities.

### Setup

1. Install dependencies: `composer install`
2. Copy `.env.example` to `.env` and configure database
3. Run migrations: `php artisan migrate`
4. Start server: `php artisan serve`

### Admin APIs

#### Admin Login

-   **URL**: `POST /api/admin/login`
-   **Body**:
    ```json
    {
        "email": "admin@gmail.com",
        "password": "12345678"
    }
    ```
-   **Response**: Access token with user details

#### Create Seller

-   **URL**: `POST /api/admin/sellers`
-   **Headers**: `Authorization: Bearer {admin_token}`
-   **Body**:
    ```json
    {
        "name": "John Doe",
        "email": "john@gmail.com",
        "phone": "1234567890",
        "country": "India",
        "state": "Maharashtra",
        "password": "12345678",
        "skills": ["PHP", "Laravel"]
    }
    ```

#### List Sellers

-   **URL**: `GET /api/admin/sellers`
-   **Headers**: `Authorization: Bearer {admin_token}`
-   **Response**: Paginated list of sellers

### Seller APIs

#### Seller Login

-   **URL**: `POST /api/seller/login`
-   **Body**:
    ```json
    {
        "email": "seller@gmail.com",
        "password": "12345678"
    }
    ```
-   **Response**: Access token with user details

#### Add Product

-   **URL**: `POST /api/seller/products`
-   **Headers**: `Authorization: Bearer {seller_token}`
-   **Body**:
    ```json
    {
        "product_name": "Mouse",
        "product_description": "Wireless Mouse",
        "brands": [
            {
                "name": "Dell",
                "description": "Dell Wireless Mouse",
                "price": 25.99
            },
            {
                "name": "HP",
                "description": "HP Wireless Mouse",
                "price": 29.99
            }
        ]
    }
    ```

#### List Products

-   **URL**: `GET /api/seller/products`
-   **Headers**: `Authorization: Bearer {seller_token}`
-   **Response**: Paginated list of seller's products

#### Delete Product

-   **URL**: `DELETE /api/seller/products/{id}`
-   **Headers**: `Authorization: Bearer {seller_token}`

#### Download Product PDF

-   **URL**: `GET /api/seller/products/{id}/pdf`
-   **Headers**: `Authorization: Bearer {seller_token}`
-   **Response**: PDF file download

### Postman Collection

Import `postman_collection.json` into Postman to test the APIs.

### Database

The application uses MySQL. Ensure the database `prominno_task` is created and configured in `.env`.
