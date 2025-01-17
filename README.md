This script is a simple budget management application that allows users to track their expenses and balance. It works with a JSON file to store budget and expense data persistently. Here's a breakdown of its functionality:

Core Functions:
add_expense(expenses, description, amount):

Adds a new expense to the expenses list.
Prints a confirmation message with the description and amount of the added expense.
get_total_expenses(expenses):

Calculates and returns the total amount of all expenses by summing the amount field of each expense in the expenses list.
get_balance(budget, expenses):

Calculates the remaining balance by subtracting the total expenses from the initial budget.
Uses the get_total_expenses function to calculate the total spent.
show_budget_details(budget, expenses):

Displays the initial budget, a list of all expenses with their descriptions and amounts, the total spent, and the remaining budget.
load_budget_data(filepath):

Loads budget data from a JSON file. If the file is not found or is empty, it returns a default budget of 0 and an empty list of expenses.
If the file exists, it returns the initial_budget and the list of expenses from the JSON file.
save_budget_details(filepath, initial_budget, expenses):

Saves the current budget and expense details to a JSON file.
The data is saved in a dictionary format with the keys initial_budget and expenses.
Main Program Flow:
Initial Setup:

When the program starts, it checks for an existing budget_data.json file. If it exists, it loads the previous budget and expenses. If not, it prompts the user to input an initial budget.
User Interaction:

The program runs a loop where the user can choose one of the following actions:
Option 1: Add a new expense (description and amount).
Option 2: View the budget details (total budget, list of expenses, total spent, and remaining balance).
Option 3: Exit the app, which saves the budget and expenses data to the budget_data.json file.
Exiting:

When the user chooses to exit, the current budget and expenses are saved, and the program ends with a goodbye message.
Key Features:
Persistent Data: Budget and expenses are saved in a JSON file so that they persist even after the program is closed.
Flexible Budget Management: The user can add multiple expenses, view details at any time, and track how much of the budget is remaining.
User-Friendly: The program provides clear instructions and feedback at each step, allowing the user to interact easily.
Usage:
The user is prompted to enter their initial budget if no data is found in the JSON file.
The user can then add expenses, view the budget details, or exit the app.
