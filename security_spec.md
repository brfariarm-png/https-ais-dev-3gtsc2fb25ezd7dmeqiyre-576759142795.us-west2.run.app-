# Security Specification for Supreme Gourmet Apps

This document defines the security parameters, data invariants, adversarial test cases, and specifications for the Firebase Security Rules protecting the Supreme Gourmet açaí and ice cream application.

## 1. Data Invariants

### 1.1 Orders Collection (`/orders/{orderId}`)
- **Creation Requirements**: Any authenticated user can place an order. If anonymous orders are not explicitly supported, we require Google Authentication, linking the order to the authenticated user's UID (`ownerId`).
- **PII Protection**: Since orders contain PII (customer name, phone, address), standard users can only read (`get`) their own orders (`resource.data.ownerId == request.auth.uid`). General blanket reads (read without a specific owner limit) must be completely forbidden to prevent scraping of customer databases.
- **Immutability**: Once an order is created, its critical attributes (`ownerId`, `total`, `createdAt`) are completely immutable to prevent fraud or state tamper.
- **Terminal State Locking**: Once an order status is marked as `completed`, it cannot be changed, or if status history flows from `waiting` to `completed`, it cannot reverse.

### 1.2 Settings Collection (`/settings/{settingId}`)
- **Public Visibility**: Because settings contain operating hours, store name, address, and phone, they are publicly readable (`allow get, list: if true`) to enable correct client bootstrap.
- **Strict Write Restrictions**: Only verified administrators can modify settings. No regular user should have access to create, update, or delete settings docs.

## 2. The "Dirty Dozen" Spoof/Vulnerability Payloads

Below represent 12 adversarial payloads aiming to violate identity, integrity, and safety:

### Payload 1: Shadow Update / Ghost field injection on Order
- **Target**: `/orders/test-order`
- **Attempt**: Inject a `isVipOrder: true` or `discountCode: "FREE"` field that doesn't belong in the schema.
- **Expected Outcome**: `PERMISSION_DENIED` via strict validation size checks or key checks.

### Payload 2: Hostile ID Character Spoof
- **Target**: `/orders/%F0%9F%92%A9bad-unicode-id-overflow` (or an extremely long 1KB ID string)
- **Attempt**: Poison the path variables to bypass string checks or run DOS against logging filters.
- **Expected Outcome**: `PERMISSION_DENIED` via `isValidId()`.

### Payload 3: Privilege Escalation on User profile or Settings
- **Target**: `/settings/store_config`
- **Attempt**: A regular authenticated client user tries to overwrite the business hours (`openTime = "00:00"`, `closeTime = "23:59"`) or change the status override to close the store.
- **Expected Outcome**: `PERMISSION_DENIED` since write is gated behind `isAdmin()`.

### Payload 4: Identity Spoofing (Setting someone else's ownerId)
- **Target**: `/orders/order_1`
- **Attempt**: An attacker `attacker_uid` submits an order with `ownerId = "victim_uid"`.
- **Expected Outcome**: `PERMISSION_DENIED` since `ownerId` must strictly match `request.auth.uid`.

### Payload 5: Spoofed Admin Email (Unverified Provider)
- **Target**: `/settings/store_config`
- **Attempt**: Submit a write request with `request.auth.token.email = "brfariarm@gmail.com"` but `request.auth.token.email_verified = false`.
- **Expected Outcome**: `PERMISSION_DENIED` because rules strictly enforce `email_verified == true`.

### Payload 6: Mutating Immutable CreatedAt Timestamp
- **Target**: `/orders/my-order`
- **Attempt**: Update an existing order to tamper with its `createdAt` date to skew reporting.
- **Expected Outcome**: `PERMISSION_DENIED` because `createdAt` remains unchanged.

### Payload 7: Client-provided Future/Past Timestamps on Create
- **Target**: `/orders/any-order`
- **Attempt**: Supply `createdAt = "2030-01-01T00:00:00Z"` in order payload.
- **Expected Outcome**: `PERMISSION_DENIED` because `createdAt` MUST equal the real-time server clock `request.time`.

### Payload 8: Blanket Read List Scraping
- **Target**: `/orders` (list query)
- **Attempt**: Query the entire collection of orders without limiting records to the user's `ownerId`.
- **Expected Outcome**: `PERMISSION_DENIED` on the rule side due to missing client-query parity enforcement.

### Payload 9: Invalid String Attribute Length Overflow
- **Target**: `/orders/some-order`
- **Attempt**: Set `customerPhone` to a structured string that is 500KB long to trigger Firestore pricing and layout crashes.
- **Expected Outcome**: `PERMISSION_DENIED` because of size bounds in string properties.

### Payload 10: Status Reversal
- **Target**: `/orders/my-completed-order`
- **Attempt**: Try to downgrade order status from `'completed'` back to `'waiting'` after receiving the food.
- **Expected Outcome**: `PERMISSION_DENIED` due to terminal state locking.

### Payload 11: Non-numeric total pricing
- **Target**: `/orders/new-order`
- **Attempt**: Try to submit `total = "twenty"` (string) or `total = -5.0` (negative pricing).
- **Expected Outcome**: `PERMISSION_DENIED` via strict type and range check.

### Payload 12: Orphaned order creation without valid details
- **Target**: `/orders/new-order`
- **Attempt**: Exclude the `id`, `total` or `status` attributes entirely.
- **Expected Outcome**: `PERMISSION_DENIED` because of exact schema key matches.
