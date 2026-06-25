## Unit Assignment: Student Store

Submitted by: **Anny Dang**

Deployed Application (optional): [Student Store Deployed Site](https://site-week4-student-store-starter-ui.onrender.com)

### Application Features

#### CORE FEATURES

- [x] **Database Creation**: Set up a Postgres database to store information about products and orders.
  - [x]  Use Prisma to define models for `products`, `orders`, and `order_items`.
  - [x]  **VIDEO WALKTHROUGH SPECIAL INSTRUCTIONS**: Use Prisma Studio to demonstrate the creation of your `products`, `orders`, and `order_items` tables. 
- [x] **Products Model**
  - [x] Develop a products model to represent individual items available in the store. 
  - [x] This model should at minimum include the attributes:
    - [x] `id`
    - [x] `name`
    - [x] `description`
    - [x] `price` 
    - [x] `image_url`
    - [x] `category`
  - [x] Implement methods for CRUD operations on products.
  - [x] Ensure transaction handling such that when an product is deleted, any `order_items` that reference that product are also deleted. 
  - [x] **VIDEO WALKTHROUGH SPECIAL INSTRUCTIONS**: Use Prisma Studio to demonstrate the creation of all attributes (table columns) in your Products Model.
- [x] **Orders Model**
  - [x] Develop a model to manage orders. 
  - [x] This model should at minimum include the attributes:
    - [x] `order_id`
    - [x] `customer_id`
    - [x] `total_price`
    - [x] `status`
    - [x] `created_at`
  - [x] Implement methods for CRUD operations on orders.
  - [x] Ensure transaction handling such that when an order is deleted, any `order_items` that reference that order are also deleted. 
  - [x] **VIDEO WALKTHROUGH SPECIAL INSTRUCTIONS**: Use Prisma Studio to demonstrate the creation of all attributes (table columns) in your Order Model.

- [x] **Order Items Model**
  - [x] Develop a model to represent the items within an order. 
  - [x] This model should at minimum include the attributes:
    - [x] `order_item_id`
    - [x] `order_id`
    - [x] `product_id`
    - [x] `quantity`
    - [x] `price`
  - [x] Implement methods for fetching and creating order items.  
  - [x] **VIDEO WALKTHROUGH SPECIAL INSTRUCTIONS**: Use Prisma Studio to demonstrate the creation of all attributes (table columns) in your Order Items Model.
- [x] **API Endpoints**
  - [x] Application supports the following **Product Endpoints**:
    - [x] `GET /products`: Fetch a list of all products.
    - [x] `GET /products/:id`: Fetch details of a specific product by its ID.
    - [x] `POST /products`: Add a new product to the database.
    - [x] `PUT /products/:id`: Update the details of an existing product.
    - [x] `DELETE /products/:id`: Remove a product from the database.
  - [x] Application supports the following **Order Endpoints**:
    - [x] `GET /orders`: Fetch a list of all orders.
    - [x] `GET /orders/:order_id`: Fetch details of a specific order by its ID, including the order items.
    - [x] `POST /orders`: Create a new order with specified order items.
    - [x] `PUT /orders/:order_id`: Update the details of an existing order (e.g., change status).
    - [x] `DELETE /orders/:order_id`: Remove an order from the database.
    - [x] **VIDEO WALKTHROUGH SPECIAL INSTRUCTIONS**: Use Postman or another API testing tool to demonstrate the successful implementation of each endpoint. For the `DELETE` endpoints, please use Prisma Studio to demonstrate that any relevant order items have been deleted. 
- [x] **Frontend Integration**
  - [x] Connect the backend API to the provided frontend interface, ensuring dynamic interaction for product browsing, cart management, and order placement. Adjust the frontend as necessary to work with your API.
  - [x] Ensure the home page displays products contained in the product table.
  - [x] **VIDEO WALKTHROUGH SPECIAL INSTRUCTIONS**: Use `npm start` to run your server and display your website in your browser. 
    - [x] Demonstrate that users can successfully add items to their shopping cart, delete items from their shopping cart, and place an order
    - [x] After placing an order use Postman or Prisma Studio demonstrate that a corresponding order has been created in your orders table.

### Stretch Features

- [x] **Added Endpoints**
  - [x] `GET /order-items`: Create an endpoint for fetching all order items in the database.
  - [x] `POST /orders/:order_id/items` Create an endpoint that adds a new order item to an existing order. 
- [ ] **Past Orders Page**
  - [ ] Build a page in the UI that displays the list of all past orders.
  - [ ] The page lists all past orders for the user, including relevant information such as:
    - [ ] Order ID
    - [ ] Date
    - [ ] Total cost
    - [ ] Order status.
  - [ ] The user should be able to click on any individual order to take them to a separate page detailing the transaction.
  - [ ] The individual transaction page provides comprehensive information about the transaction, including:
    - [ ] List of order items
    - [ ] Order item quantities
    - [ ] Individual order item costs
    - [ ] Total order cost
- [ ] **Filter Orders**.
  - [ ] Create an input on the Past Orders page of the frontend application that allows the user to filter orders by the email of the person who placed the order. 
  - [ ] Users can type in an email and click a button to filter the orders.
  - [ ] Upon entering an email address and submitting the input, the list of orders is filtered to only show orders placed by the user with the provided email. 
  - [ ] The user can easily navigate back to the full list of orders after filtering. 
    - [ ] Proper error handling is implemented, such as displaying "no orders found" when an invalid email is provided.
- [x] **Deployment**
  - [x] Website is deployed using [Render](https://courses.codepath.org/snippets/site/render_deployment_guide).
  - [x] **VIDEO WALKTHROUGH SPECIAL INSTRUCTIONS**: To ease the grading process, please use the deployed version of your website in your walkthrough with the URL visible. 



### Walkthrough Video

`TODO://` Add the embedded URL code to your animated app walkthrough below, `ADD_EMBEDDED_CODE_HERE`. Make sure the video or gif actually renders and animates when viewing this README. (🚫 Remove this paragraph after adding walkthrough video)

`ADD_EMBEDDED_CODE_HERE`

### Reflection

* Did the topics discussed in your labs prepare you to complete the assignment? Be specific, which features in your weekly assignment did you feel unprepared to complete?

Yes, the labs prepared me well for setting up Prisma and understanding how the ORM connects to PostgreSQL. The lab exercises on schema design and CRUD operations gave me a solid foundation for building the Product, Order, and OrderItem models. However, I felt less prepared for the transactional flow in `POST /orders` — handling multiple table writes atomically with `prisma.$transaction()` was new to me, and I had to research how to validate products before creating the order to ensure data integrity. The cascade delete behavior also required extra reading to understand how `onDelete: Cascade` works with foreign key relationships.

* If you had more time, what would you have done differently? Would you have added additional features? Changed the way your project responded to a particular event, etc.
  
If I had more time, I would have:
1. Built the **Past Orders Page** in the frontend with email filtering UI (the backend already supports it)
2. Added a proper **admin dashboard** for managing products through the UI instead of using Postman
3. Improved the **UI design** with better styling, animations, and a more polished look
4. Added **user authentication** so customers could have real accounts instead of using hardcoded customer IDs
5. Implemented **product image uploads** instead of relying on URLs
6. Added **inventory tracking** to prevent ordering out-of-stock items

* Reflect on your project demo, what went well? Were there things that maybe didn't go as planned? Did you notice something that your peer did that you would like to try next time?

I did not have a project demo this time, but I observed my friends' presentations. I noticed they put a lot of effort into making their demos clear and easy to follow — walking through each feature step-by-step. Next time, I'd like to:
- Prepare a structured demo script that highlights the most complex features (like the transactional order creation)
- Use **Prisma Studio** to visually demonstrate cascade deletes
- Practice explaining technical decisions out loud to make my walkthrough more confident

### Open-source libraries used

- **[Express.js](https://expressjs.com/)** - Web framework for the backend API
- **[Prisma](https://www.prisma.io/)** - ORM for database access and migrations
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database
- **[CORS](https://www.npmjs.com/package/cors)** - Middleware for cross-origin requests
- **[Nodemon](https://nodemon.io/)** - Auto-restart dev server on file changes
- **[Axios](https://axios-http.com/)** - HTTP client for the frontend
- **[React](https://react.dev/)** - Frontend library
- **[Vite](https://vitejs.dev/)** - Frontend build tool
- **[React Router](https://reactrouter.com/)** - Client-side routing

### Shout out

Huge shout out to **Audrey, Danny, and Greg** for helping me deploy this website to Render — debugging the Prisma deployment issues was tough, and their patience made a huge difference. Also, thank you to all the people who have been my motivation throughout this project!