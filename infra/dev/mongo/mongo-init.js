// mongo-init.js

// Define the schema for the 'users' collection
db.createCollection("users", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["name", "email"],
            properties: {
                name: {
                    bsonType: "string",
                    description: "must be a string and is required"
                },
                email: {
                    bsonType: "string",
                    pattern: "^\\S+@\\S+$",
                    description: "must be a string and match the regular expression pattern"
                }
            }
        }
    }
});

// You can define more collections and their schemas similarly
// db.createCollection("another_collection", { ... });

print("Collections created successfully");
