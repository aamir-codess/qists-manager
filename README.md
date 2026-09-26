# Installment Hub

Build a mobile-friendly web app called "InstallmentTracker" for small shops that sell products on monthly installments.



Login: email and password for the shop owner.



Pages:

1. Dashboard: total outstanding amount, payments due this week, overdue customers (in red), and total collected this month.

2. Customers: add, edit and search customers (name, phone, address, CNIC/ID number).

3. New Sale: pick a customer, enter the product name, total price, down payment, number of months, and start date. Auto-calculate the monthly installment and create the full payment schedule.

4. Customer Detail: sale info, schedule with paid/unpaid/overdue status, and a "Record Payment" button that logs the amount and date.

5. Reminders: a list of customers with due or overdue installments, each with a button that opens WhatsApp with a pre-filled message: "Assalam o Alaikum [Name], your installment of Rs. [amount] was due on [date]. Please pay at your earliest."



Design: clean, simple, large buttons, works well on a phone, and supports English with Rs. currency.

Use Supabase for the database, with row-level security so each shop owner only sees their own data.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://qists-manager.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f6c6bb65-d4e7-47d5-942d-1a55e5a86508).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
