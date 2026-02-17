Alerts
Alerts are messages that are sent from SDK to the application when a malfunction occurs. There are two alert categories:

Warning - indicates a minor, temporary issue that does not interrupt the current operation.
Error - indicates a severe incident that cannot be resolved by the SDK and results in the termination of any in-progress measurement.
The alert interface contains a numeric code that represents a specific issue.

The reasons for warnings and errors can vary - from accuracy problems to incorrect API usage, to license issues or even device-related errors.

Receiving Alerts
In the event that an alert is received, it is recommended to display the numeric alert code in the UI for reference. If the alert is related to a misuse of the SDK or to improper measurement conditions, and the issue persists, please contact the support team.

The application can receive alerts using OnError and OnWarning callback interfaces.

import { 
    AlertData
} from '@biosensesignal/web-sdk';

const onError = (errorData: AlertData) => {
    // Receive errors
};

const onWarning = (warningData: AlertData) => {
    // Receive warnings
};

Warnings
A warning indicates a minor, temporary issue. While a warning does not interrupt the measurement, it is encouraged to guide the user on how to avoid such warnings in the future, and to follow the best practices for taking a measurement.

import { 
    AlertData
} from '@biosensesignal/web-sdk';

// Handle warnings
const onWarning = (warningData: AlertData) => {
    console.log(`Warning: ${warningData.code}`);
};

Errors
An error indicates a severe incident from which the SDK cannot recover. Some of the common reasons for errors include network issues, CPU overload, insufficient lighting, and sub-standard environmental conditions. See the Alerts List for details on each error.

When an error occurs during the measurement, the SDK will terminate any ongoing measurement and will refrain from sending vital sign results to the application. Additionally, the session state will transition from MEASURING to STOPPING (see Session States).

Internal Errors
If an invalid SDK internal state occurs during the operation of the SDK, an internal error will be returned to the application. The internal error number may not appear in the Alerts List page. As mentioned earlier, it is advisable to display the error number in the user interface for reference.

If an internal error is received, please report it to the support team. Include the error code you received and provide a detailed description of the problem.

import { 
    AlertData
} from '@biosensesignal/web-sdk';

// Handle error
const onError = (errorData: AlertData) => {
    console.log(`Error: ${errorData.code}`);
};