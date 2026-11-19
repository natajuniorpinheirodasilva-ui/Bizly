package httpapi

// TODO: registerRequest / loginRequest structs with json tags (company_name, name, email, password).

// TODO: handleRegister (POST /api/v1/auth/register)
//   - decode + validate input
//   - in one transaction: insert company (unique slug), user, membership (OWNER)
//   - duplicate email (pg code 23505) -> 400 "User with this email already exists."
//   - 200 {"message": "Account created"}

// TODO: handleLogin (POST /api/v1/auth/login)
//   - find user by email, check password, load membership (company_id, role)
//   - wrong email or password -> 401 "Invalid credentials" (same message for both)
//   - 200 {access_token, token_type: "bearer", user: {id, name, email, role, company_id}}
