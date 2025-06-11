## Conceptual Database Schema

### Users Table
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| user_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier for the user |
| username | VARCHAR(255) | NOT NULL, UNIQUE | User's chosen username |
| email | VARCHAR(255) | NOT NULL, UNIQUE | User's email address |
| password_hash | VARCHAR(255) | NOT NULL | Hashed password for security |
| registration_date | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Date and time of user registration |
| user_type | ENUM('freelancer', 'client') | NOT NULL | Type of user |
| full_name | VARCHAR(255) | | User's full name |
| profile_picture_url | VARCHAR(255) | | URL to the user's profile picture |
| skills | TEXT | | Comma-separated list of skills (for freelancers) |
| hourly_rate | DECIMAL(10, 2) | | Hourly rate (for freelancers) |
| tagline | VARCHAR(255) | | Short bio or tagline |
| country | VARCHAR(100) | | User's country |
| last_login | TIMESTAMP | | Timestamp of the last login |

### Projects Table
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| project_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier for the project |
| client_id | INT | NOT NULL, FOREIGN KEY (Users.user_id) | ID of the client who posted the project |
| title | VARCHAR(255) | NOT NULL | Title of the project |
| description | TEXT | NOT NULL | Detailed description of the project |
| budget_min | DECIMAL(10, 2) | | Minimum budget for the project |
| budget_max | DECIMAL(10, 2) | | Maximum budget for the project |
| category | VARCHAR(100) | | Project category (e.g., web development, design) |
| required_skills | TEXT | | Comma-separated list of required skills |
| status | ENUM('open', 'in_progress', 'completed', 'cancelled') | NOT NULL, DEFAULT 'open' | Current status of the project |
| creation_date | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Date and time of project creation |
| deadline | DATE | | Project deadline |
| selected_freelancer_id | INT | FOREIGN KEY (Users.user_id) | ID of the freelancer selected for the project (if any) |

### Bids Table
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| bid_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier for the bid |
| project_id | INT | NOT NULL, FOREIGN KEY (Projects.project_id) | ID of the project the bid is for |
| freelancer_id | INT | NOT NULL, FOREIGN KEY (Users.user_id) | ID of the freelancer placing the bid |
| bid_amount | DECIMAL(10, 2) | NOT NULL | Amount proposed by the freelancer |
| proposal | TEXT | NOT NULL | Freelancer's proposal for the project |
| estimated_delivery_time | VARCHAR(50) | | Estimated time to complete the project |
| bid_status | ENUM('pending', 'accepted', 'rejected') | NOT NULL, DEFAULT 'pending' | Status of the bid |
| creation_date | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Date and time of bid creation |

### Reviews Table
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| review_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier for the review |
| project_id | INT | NOT NULL, FOREIGN KEY (Projects.project_id) | ID of the project being reviewed |
| reviewer_id | INT | NOT NULL, FOREIGN KEY (Users.user_id) | ID of the user writing the review |
| reviewee_id | INT | NOT NULL, FOREIGN KEY (Users.user_id) | ID of the user being reviewed |
| rating | INT | NOT NULL, CHECK (rating >= 1 AND rating <= 5) | Rating from 1 to 5 stars |
| comment | TEXT | | Textual feedback |
| creation_date | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Date and time of review creation |

### Messages Table
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| message_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier for the message |
| sender_id | INT | NOT NULL, FOREIGN KEY (Users.user_id) | ID of the user sending the message |
| receiver_id | INT | NOT NULL, FOREIGN KEY (Users.user_id) | ID of the user receiving the message |
| project_id | INT | FOREIGN KEY (Projects.project_id) | Optional: ID of the project the message relates to |
| content | TEXT | NOT NULL | Content of the message |
| creation_date | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Date and time of message creation |
| is_read | BOOLEAN | DEFAULT FALSE | Whether the message has been read by the receiver |

## Relationships

*   **Users to Projects:** One-to-Many (a client can have multiple projects, a project belongs to one client). `Projects.client_id` -> `Users.user_id`. A project can also have one selected freelancer: `Projects.selected_freelancer_id` -> `Users.user_id`.
*   **Users to Bids:** One-to-Many (a freelancer can place multiple bids, a bid belongs to one freelancer). `Bids.freelancer_id` -> `Users.user_id`.
*   **Projects to Bids:** One-to-Many (a project can have multiple bids, a bid belongs to one project). `Bids.project_id` -> `Projects.project_id`.
*   **Users to Reviews:** One-to-Many (a user can write multiple reviews, a user can receive multiple reviews). `Reviews.reviewer_id` -> `Users.user_id` and `Reviews.reviewee_id` -> `Users.user_id`.
*   **Projects to Reviews:** One-to-Many (a project can have multiple reviews). `Reviews.project_id` -> `Projects.project_id`.
*   **Users to Messages:** One-to-Many for both sender and receiver. `Messages.sender_id` -> `Users.user_id` and `Messages.receiver_id` -> `Users.user_id`.
*   **Projects to Messages (Optional):** A message can optionally be linked to a project. `Messages.project_id` -> `Projects.project_id`.
