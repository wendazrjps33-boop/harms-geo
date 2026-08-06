-- GeoRank Initial Data

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password, name)
VALUES ('admin@georank.com', '$2b$12$bzYp72PkCCYCvi1MOww4UO.L2rb/t8D1ylMKBoXyGF7w1u/hlsUaK', 'Admin User');

-- Insert test brand
INSERT INTO brands (user_id, name, website, description, visibility_score) 
VALUES (1, 'Test Company', 'https://testcompany.com', 'A test company for demonstration', 45.2);

-- Insert test queries
INSERT INTO brand_queries (brand_id, query) VALUES (1, 'best tech companies');
INSERT INTO brand_queries (brand_id, query) VALUES (1, 'top software solutions');