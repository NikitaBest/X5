Полная инструкция сервича : https://developer.biosensesignal.com/web/latest/

SDK Integration
Once you receive the BiosenseSignal_Web_Sample_X.X.X.zip file, you are ready to add the Web SDK to your application.

Follow the steps below to integrate the SDK into your application.

1. Add the BiosenseSignal SDK package to your Project
1.1. Extract the BiosenseSignal_Web_Sample_X.X.X.tgz file.

1.2. Copy the biosensesignal-web-sdk-vX.X.X-X.tgz file into your project folder

1.3. Use npm to install:


npm install biosensesignal-web-sdk-vX.X.X-X.tgz
Or yarn:


yarn install biosensesignal-web-sdk-vX.X.X-X.tgz
1.4. Add the following to your webpack.config.js file plugins:


    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(paths.node_modules, '@biosensesignal/web-sdk/dist'),
            to: path.resolve(paths.build),
            globOptions: {
              ignore: ["**/main.*"]
            }
          },
        ],
      }),
    ]

    Web Sample Application
The Sample Application (also abbreviated as "SampleApp") is a reference project for implementing an application based on the BiosenseSignal SDK.

Dependencies
Install Visual Studio Code or other IDE which is suitable for web development.
Install Node.js version >= 14 for building the project.
Install Package manager (npm or yarn) - If you installed Node.js, npm is already set up.
Building the Sample Application
The following instructions are relevant for Web sample application.

Unzip BiosenseSignal_Web_Sample_X.X.X.zip.
Open Visual Studio Code.
Select File->Open.
Choose the unzipped folder BiosenseSignal_Web_Sample_X.X.X.
Click on Open.
Open the terminal and change directory to the extracted sample-app directory.
Run yarn install or npm install.
Run yarn start or npm start and wait for the building process to finish.
The SampleApp is now served from local server. Open your browser and enter the address that appears in the console - The app should open.
Note

When opening the app from a mobile device browser, your PC (Local server) and mobile device must be connected to the same WIFI.

Measuring Vital Signs
Position your face in the center of the camera preview.
Click the Start button.
Pulse Rate vital sign values (this is an example of an "instantaneous" value) should be received after approximately 8 seconds.
After the measurement ends (either by tapping on the Stop button or at the end of the defined measurement duration), Pulse Rate (PR), Respiration Rate (RR), Stress Level (SL), SDNN and Blood Pressure (BP) results will be shown (this is an example of a "final" result).
The final results may be invalid if there was insufficient measuring time.
For a list of supported indicators and their required measurement durations, see the Indicators Technical Information page.
Also see the following relevant pages:
    - Best practices on how to take a measurement
    - SDK Accuracy Targets
    - SDK Alerts


Add COOP and COEP Headers to Allow Use of SharedArrayBuffer
Intro
Our multi-threaded WASM relies on SharedArrayBuffer which is gated behind COOP and COEP headers.

Goal
Add COOP and COEP headers to allow use of SharedArrayBuffer.

Note

SharedArrayBuffer in Safari/iOS is only supported from version 15.2 so make sure your browser is up to date.

Solution
Our Web SDK uses SharedArrayBuffer which requires cross-origin isolation. Follow these instructions to enable cross-origin isolation:

Set the Cross-Origin-Opener-Policy: same-origin header on your top-level document. If you had set Cross-Origin-Opener-Policy-Report-Only: same-origin, replace it. This blocks communication between your top-level document and its popup windows.

Set the Cross-Origin-Embedder-Policy: require-corp header on your top-level document. If you had set Cross-Origin-Embedder-Policy-Report-Only: require-corp, replace it. This will block the loading of cross-origin resources that are not opted-in.

Check that self.crossOriginIsolated returns true in console to verify that your page is cross-origin isolated.

Notes for Issues with iframe or Integrations with Third Party Packages

Enabling cross-origin isolation on a local server might be challenging as simple servers do not support sending headers. You can launch Chrome with a command-line flag --enable-features=SharedArrayBuffer to enable SharedArrayBuffer without enabling cross-origin isolation. Learn how to run Chrome with a command line flag on respective platforms.
For a production server you could register for an origin trial here: Delaying the Desktop Chrome change
If you are using cross-origin resources, cross-origin isolation requires explicitly opting in all cross-origin resources. Follow these steps to opt them in:

On cross-origin resources such as images, scripts, stylesheets, iframes, and others:

Set the Cross-Origin-Resource-Policy: cross-origin header
For same-site resources, set Cross-Origin-Resource-Policy: same-site header
For resources loadable using CORS:

Set the crossorigin attribute in HTML tags (e.g., <img src="example.jpg" crossorigin>)
For JavaScript fetch requests, set request.mode to cors
For iframes using SharedArrayBuffer:

Add allow="cross-origin-isolated" to the <iframe> tag
For nested iframes or worker scripts, apply these steps recursively
Set Cross-Origin-Embedder-Policy: require-corp header on all iframes and worker scripts
Handle popup windows:

Note that cross-origin popup windows using postMessage() won't work with cross-origin isolation
Alternative solutions:
Move communication to a non-cross-origin isolated document
Use HTTP requests instead
Impact Analysis (Optional)
You can also analyze the impact of cross-origin isolation on your cross-origin resources before enabling by following the instruction given below. Please keep in mind that this is not a mandatory step but it can help you assess which resources will or might be affected by cross origin-isolation.

Set Cross-Origin-Opener-Policy-Report-Only: same-origin on your top-level document1. As the name indicates, this header only sends reports about the impact that COOP: same-origin would have on your site—it won't actually disable communication with popup windows
Set up reporting and configure a web server to receive reports
Set Cross-Origin-Embedder-Policy-Report-Only: require-corp on your top-level document. Again, this header lets you see the impact of enabling COEP: require-corp without actually affecting your site's functioning yet. You can configure this header to send reports to the same reporting server that you set up in the previous step.
How to Add COOP and COEP Headers for IIS
IIS Setup
There are three ways to add COOP and COEP headers in IIS:

1. Using IIS Manager
Follow these instructions and add:


Name: Cross-Origin-Opener-Policy
Value: same-origin

Name: Cross-Origin-Embedder-Policy
Value: require-corp
2. In IIS config - add lines 5 and 6 below in your IIS Config.

<configuration>
 <system.webServer>
  <httpProtocol>
   <customHeaders>
    <add name="Cross-Origin-Opener-Policy" value="same-origin" /> 
    <add name="Cross-Origin-Embedder-Policy" value="require-corp" />
   </customHeaders> 
  </httpProtocol>
 </system.webServer>
</configuration>
3. Programmatically - see this link for your preferred language
How to Add COOP and COEP Headers for CloudFront
Enter AWS CloudFront > Function and add modify-headers handler like so:
image cloudfront1

CloudFront Function Code:

javascript
function handler(event) {
   var response = event.response;
   var headers = response.headers;

   /* Set the headers - must be lowercased */
   headers['cross-origin-opener-policy'] = {value: 'same-origin'};
   headers['cross-origin-embedder-policy'] = {value: 'require-corp'};
   headers['cloudfront-function'] = {value: 'true'};
   return response;
}
To associate the modify-headers to a specific distributions you have the following two options:

Option 1:
In Publish tab above click on "Add association" to add the distribution like so:

image cloudfront2

Option 2:
Enter CloudFront > Distributions > Behaviors and click on "Create behavior."
image cloudfront3

Scroll down to "Function Association" and select modify-headers under "Viewer response".
image cloudfront4

Finally, click on "Save changes"


Quick Start
This quick start guide describes the basic flow for measuring vital signs using the BiosenseSignal SDK.

Creating a Measurement Session
A session is an interface for performing vital sign measurements.

Only a single session can be created at any given time. Terminate the previous session before creating a new session.
A session is intended for a single user. When measuring the vital signs of another user, a new session must be created. See User Information.
The following code can be used to create a session with the relevant parameters:


TypeScript
TypeScript
import healthMonitorManager, {
    FaceSessionOptions
} from '@biosensesignal/web-sdk';

await healthMonitorManager.initialize({
    licenseKey,
});

const options: FaceSessionOptions = { 
    input: video.current,
    cameraDeviceId: cameraId,
    processingTime,
    onVitalSign,
    onFinalResults,
    onError,
    onWarning,
    onStateChange,
    onImageData,
};

const faceSession = await healthMonitorManager.createFaceSession(options);
Waiting for the Session to Transition into ACTIVE State
The application can receive session state updates by using the OnStateChange callback interface:


TypeScript
TypeScript

import { 
    SessionState, 
} from '@biosensesignal/web-sdk';

const onStateChange = useCallback((state: SessionState) => {
    if (state == SessionState.ACTIVE) {
        console.log("Session is ready to start measuring");
    }
}, []);
Note

For more information on session states and state transitions, see Session State section.

Starting a Measurement
A measurement can be started by calling the start() method:


TypeScript
TypeScript
session.start();
Receiving Results During a Measurement
The application can receive instantaneous vital signs values by using OnVitalSign callback interface:


TypeScript
TypeScript
import { 
    VitalSigns,
} from '@biosensesignal/web-sdk';

const onVitalSign = useCallback((vitalSign: VitalSigns) => {
    // Handle vital sign result 
}, []);
During the measurement, the instantaneous vital sign values are available only for specific vital signs, while the results of all vital signs are received once the measurement has been completed.

Note

For more information on receiving and handling vital sign information, see Vital Signs.

Stopping a Measurement
The measurement is stopped either after the measurement duration (provided in the start function) has ended, or when the stop method is called.


TypeScript
TypeScript
session.stop();
Note

Calling the stop method initiates the calculation of the final results. See Vital Signs

Important

When the measurement stops, the session will transition to the STOPPING state.

The STOPPING state reflects that the session has initiated a stopping process that ends when the session state transitions to ACTIVE. At this point, a new measurement can be started.

Receiving Final Results
The application can receive final vital sign results and vital sign confidence levels by implementing OnFinalResults callsback interface:


TypeScript
TypeScript
import { 
    VitalSignsResults,
} from '@biosensesignal/web-sdk';

const onFinalResults = useCallback((vitalSignsResults: VitalSignsResults) => {
    // Handle the final results of the measurements
}, []);
The final results are computed when the session is in STOPPING state. For more information about receiving and handling the final results, see Vital Signs.

Terminating a Session
It is recommended to terminate the session whenever the measuring screen is not visible. The terminate() method provides a safe and structured way to shut down an active session. It ensures that all allocated resources are released properly while allowing execution to continue immediately.

Description

Terminates the active session and releases resources. This function initiates the termination process but does not block execution while waiting for it to complete.

Usage


TypeScript
TypeScript
session.terminate();
console.log("Session termination initiated.");
Behavior

If the session is already terminated, the function does nothing.
If the session is active, it starts the termination process asynchronously.
Non-blocking behavior: The function returns immediately, even if cleanup is still in progress.
Expected Developer Behavior

✅ Call terminate() when the session is no longer needed.

✅ Do not assume immediate termination; if logic depends on session termination, implement necessary wait logic before proceeding.

✅ Handle any warnings or logs to monitor the termination process.

❌ Do not attempt to restart a terminated session. A new session must be created instead.

Example Usage


TypeScript
TypeScript
session.terminate();
console.log("Session termination initiated.");
Ensuring Completion Before Proceeding If subsequent actions depend on session termination, listen to the OnStateChange callback and make sure the session is terminated before proceeding:


TypeScript
TypeScript
import { 
    SessionState, 
} from '@biosensesignal/web-sdk';

const onStateChange = useCallback((state: SessionState) => {
    switch (state) {            
        case SessionState.TERMINATED:
            console.log("Session is terminated");
            break;
    }
}, []);
Session Lifecycle: Termination Flow

Developer calls terminate() → Session enters the termination phase.
Internal cleanup begins (asynchronously) → Resources like the camera and processing units are released.
Session state updates to TERMINATED once the cleanup is complete.
Further API calls dependent on an active session will fail.
Frequently Asked Questions

❓ How can I know when termination is complete?

Since terminate() is non-blocking, you should not assume immediate completion. Instead: Monitor session state reaches the SessionState.TERMINATED state. Listen to system logs for confirmation.

❓ What happens if I call terminate() twice?

Calling terminate() on an already terminated session has no effect.

❓ Will terminate() throw errors?

No, terminate() handles errors internally. If error handling is required, monitor session state.

Conclusion

Use terminate() to properly close a session.
Expect non-blocking behavior – termination runs in the background.
Check session state before and after termination if required.

Session State
A measuring session is always in a "state". The session transitions between possible states either by following an API action called by the application, or via internal logic that is intended to prepare the session for performing measurements. The session state diagram appears in the figure below.

Session States
State Diagram

The table below provides a description of each session state:

State Name	State Definition
INIT	The session is in its initial state, performing initialization actions. Please wait until you receive the message indicating that the session is in the ACTIVE state before starting to measure vital signs or before calling any session APIs.
ACTIVE	The session is now ready to be started. The application can display the camera preview, if using face measurements. Refer to the Creating a Preview page for detailed instructions.
MEASURING	The session is processing the data and calculating vital signs. For information on the handling of instantaneous vital signs, please refer to the Vital Signs page.
STOPPING	The session has been stopped, and the measurement results are being calculated. For information on the handling the final results, please see the Vital Signs page.
TERMINATED	The session has been gracefully terminated, and a new session can now be initiated.
Session State Transitions
The table below describes the actions that cause a transition between the states:

State	Next State	Trigger
INIT	ACTIVE	Once all initialization actions are completed, the session transitions to the ACTIVE state.
ACTIVE	MEASURING	Calling the start() method causes the session to transition to the MEASURING state.
MEASURING	STOPPING	The session will transition to the STOPPING state under the following circumstances:
*The measurement ends gracefully either because it reached the defined duration or due to a manual invocation of the stop() method.
*The measurement was stopped due to an error. Refer to the Alerts section for more information.
STOPPING	ACTIVE	The SDK has finished performing the vital sign calculations.
READY	TERMINATED	By calling the terminate() method, the session transitions to the TERMINATED state.
Note

The STOPPING state is a 'transition state' that end automatically after a short period. Do not call any session methods while the session is in transition.

Receiving Session State Updates
The application can receive session state updates by using OnStateChange callback:


TypeScript
TypeScript
import { 
    SessionState, 
} from '@biosensesignal/web-sdk';

const onStateChange = useCallback((state: SessionState) => {
    // Receive session state updates
}, []);
Handling State Transitions
The code below is a simple example for handling session transitions updates by using OnStateChange callback:


TypeScript
TypeScript
import { 
    SessionState, 
} from '@biosensesignal/web-sdk';

const onStateChange = useCallback((state: SessionState) => {
    switch (state) {
        case SessionState.INIT:
            console.log("Session is initializing and NOT ready");
            break;
        case SessionState.ACTIVE:
            console.log("Session is ready to start measuring");
            break;
        case SessionState.MEASURING:
            console.log("Session is measuring vital signs");
            break;
        case SessionState.STOPPING:
            console.log("Session is stopping the measuring of vital signs");
            break;
        case SessionState.TERMINATED:
            console.log("Session is terminated");
            break;
    }
}, []);


Enabled Vital Signs
Enabled Vital Signs is a map of vital signs that are set to be measured in the course of a specific session.

Receiving Enabled Vital Signs
The application can receive information regarding the enabled vital signs by using onEnabledVitalSigns callback (under the LicenseInfo interface):


TypeScript
TypeScript
import { 
    EnabledVitalSigns
} from '@biosensesignal/web-sdk';

const onEnabledVitalSigns = useCallback((vitalSigns: EnabledVitalSigns) => {
    // Receive the enabled vital signs for the session
}, []);
Checking if a Vital Sign is Enabled
The following code can be used to determine the supported vital signs:


TypeScript
TypeScript
import { 
    EnabledVitalSigns
} from '@biosensesignal/web-sdk';

const onEnabledVitalSigns = useCallback((enabledVitalSigns: EnabledVitalSigns) => {
    // Checking if pulse rate is enabled
    console.log(`Is pulse rate enabled: ${enabledVitalSigns.isEnabledPulseRate}`)
}, []);

User Information
For the calculation of the ASCVD Risk and Heart Age indicators, the SDK requires receiving the user information with the details of the user taking the measurement. If this information is not provided to the SDK, these indicators will not be calculated.

The user information consists of these fields:

Sex (as classified at birth) [UNSPECIFIED / MALE / FEMALE]
Age [years]
Weight [Kilograms]
Height [Centimeters]
Smoking Status [UNSPECIFIED / SMOKER / NON_SMOKER]
The application can provide the user information as part of the session initialization.

In the following example, the sex is female, the age is 35 years, the weight is 65 kilograms, the height is 165 centimeters and the smoking status is smoker. In the example the measurement session is a face session, but it can be used in a PPG Device session as well.


TypeScript
TypeScript
import healthMonitorManager, {
    FaceSessionOptions,
    Sex,
    SmokingStatus,
} from '@biosensesignal/web-sdk';

await healthMonitorManager.initialize({
    licenseKey,
});

const options: FaceSessionOptions = { 
    input: video.current,
    cameraDeviceId: cameraId,
    processingTime,
    onVitalSign,
    onFinalResults,
    onError,
    onWarning,
    onStateChange,
    onImageData,
    userInformation: {sex: Sex.MALE, age: 35, weight: 75, height: 165, smokingStatus: SmokingStatus.NON_SMOKER}, 
};

const faceSession = await healthMonitorManager.createFaceSession(options);  
If any of the user information parameters is unknown, it is recommended to provide the known parameters and to leave the others 'null'/'UNSPECIFIED'.

Creating a Preview for the User
As part of your application, it is recommended to present the user with a camera preview, as it helps the user to center his/her face on the camera screen. The following code can be used to create a preview and present it to the user.

Note

Unlike native SDKs, the camera preview is rendered directly on the Video element by the browser, rather than by the BiosenseSignal SDK.

1. Create a video element in your web application
TypeScript
import styled from 'styled-components';
import { mirror } from '@biosensesignal/common/src/style/mirror';

const Video = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  object-fit: cover;
  height: 100%;
  ${mirror};
  @media (max-width: 1000px) and (orientation: landscape) {
    height: 100%;
  }
`;
 
const videoElement = useRef<HTMLVideoElement>(null);

return (
    <>
        <Video
            ref={videoElement}
            id="video"
            muted={true}
            playsInline={true}
        />
    </>
);
2. Pass the video element to the SDK when creating a session
TypeScript
import healthMonitorManager, {
    FaceSessionOptions,
} from '@biosensesignal/web-sdk';

await healthMonitorManager.initialize({
    licenseKey,
});

const options: FaceSessionOptions = { 
    input: videoElement.current, 
    cameraDeviceId: cameraId,
    processingTime,
    onVitalSign,
    onFinalResults,
    onError,
    onWarning,
    onStateChange,
    onImageData,
};

const faceSession = await healthMonitorManager.createFaceSession(options); 

Device Orientation
The SDK supports the setting of the device orientation in face measurement sessions. The orientation is determined by the application during the session creation and can be set according to the current device orientation at the time the session is created, or according to the preferred UI orientation.

The orientation is defined as the position of the native base of the device (also commonly known as the charging port location), relative to the device's current rotation. For example, if the device is rotated so its base is to the left of the user, then the orientation is defined as LANDSCAPE_LEFT.

Upon session creation, if no specific orientaion is requested, the legal orientation is the device's orientation once 'start' is being called.

In the following example, the device orientation is LANDSCAPE_LEFT:


TypeScript
TypeScript
import healthMonitorManager, {
    FaceSessionOptions,
    DeviceOrientation
} from '@biosensesignal/web-sdk';

await healthMonitorManager.initialize({
    licenseKey,
});

const options: FaceSessionOptions = {  
    input: video.current,
    cameraDeviceId: cameraId,
    processingTime,
    onVitalSign,
    onFinalResults,
    onError,
    onWarning,
    onStateChange,
    onImageData,
    orientation: DeviceOrientation.PORTRAIT, 
};

const faceSession = await healthMonitorManager.createFaceSession(options); 
The SDK defines the possible device orientations as an enum:


TypeScript
TypeScript
export enum DeviceOrientation {
  PORTRAIT,            
  LANDSCAPE_LEFT,      
  LANDSCAPE_RIGHT    
}
When the device orientation differs from the requested orientation during a measurement, then:

The SDK will indicate that the image orientation is incorrect as part of Image Validity.
Images with an incorrect orientation will not be processed by the SDK.

mage Validity
While the basic instruction for taking a measurement is simple—just look at the camera and start the measurement—there are a few guidelines that the user must follow to ensure accurate measurement results. These guidelines are listed in the best practices for taking a measurement.

During the measurement, the SDK assists the user in following these guidelines. It validates each camera image and updates the ImageValidity with any detected deviations from the guidelines.

An image is considered valid if the SDK did not detect any violations to the best practices for taking a measurement. If the image is not considered valid the SDK reports the reason for invalidating the image.

The conditions in the table below will invalidate the image for processing by the SDK.

Name	Meaning
VALID	The image is valid.
INVALID_DEVICE_ORIENTATION	The device orientation is unsupported for the session.
INVALID_ROI	The SDK cannot detect the user's face.
TILTED_HEAD	The user's face is not facing directly towards the camera.
FACE_TOO_FAR	Currently not supported in Web
UNEVEN_LIGHT	The light on the user's face is not evenly distributed.
Image validity verification is reported as part of OnImageData callback interface:


TypeScript
TypeScript
import healthMonitorManager, { 
    FaceSessionOptions,
    ImageValidity
} from '@biosensesignal/web-sdk';

const onImageData = useCallback((imageValidity: ImageValidity) => {
let message: string;
if (imageValidity != ImageValidity.VALID) {
    switch (imageValidity) {
    case ImageValidity.INVALID_DEVICE_ORIENTATION:
        message = 'Unsupported Orientation';
        break;
    case ImageValidity.TILTED_HEAD:
        message = 'Head Tilted';
        break;
    case ImageValidity.FACE_TOO_FAR: // Placeholder, currently not supported
        message = 'You Are Too Far';
        break;
    case ImageValidity.UNEVEN_LIGHT:
        message = 'Uneven Lighting';
        break;
    case ImageValidity.INVALID_ROI:
    default:
        message = 'Face Not Detected';
    }
    console.log(`ImageValidity = ${message}`);
} 

const options: FaceSessionOptions = { 
    input: video.current,
    cameraDeviceId: cameraId,
    processingTime,
    onVitalSign,
    onFinalResults,
    onError,
    onWarning,
    onStateChange,
    onImageData 
};

const faceSession = await healthMonitorManager.createFaceSession(options); 

}, []);
Note

It is possible that an image is not valid due to several reasons. For example, when a user is too far and the light is not evenly distributed on his face.


Measurement Guidance
For precise face measurements with the BiosenseSignal SDK, the user is required to follow the image validation guidance. The SDK guides users to adhere to measurement guidelines, specifying exceptions in the Image Validity information. For detailed information on image validity, see the Image Validity page.

The SDK notifies the application about the image validity of each frame. It is highly recommended to prompt the user for any reported exception and instruct them to adhere to the best practices for taking a measurement. Utilize the sample application code for implementing image validity prompt notifications.

The SDK supports configuring whether to enable strict measurement guidance. This setting determines whether the SDK processes all video images when a face is detected (default behavior) or only processes images with valid image validity. In the following example, the strict measurement guidance is set to true:


TypeScript
TypeScript
import healthMonitorManager, {
    FaceSessionOptions
} from '@biosensesignal/web-sdk';

await healthMonitorManager.initialize({
    licenseKey,
});

const options: FaceSessionOptions = { 
    input: video.current,
    cameraDeviceId: cameraId,
    processingTime,
    onVitalSign,
    onFinalResults,
    onError,
    onWarning,
    onStateChange,
    onImageData,
    strictMeasurementGuidance: true, 
};

const faceSession = await healthMonitorManager.createFaceSession(options); 
Strict Measurement Guidance Set to False (Default)
When set to false (default SDK behavior), the SDK processes all video images as long as a face is detected (ROI image data exists).

Strict Measurement Guidance Set to True
When set to true, the SDK will process only valid face images to ensure increased precision.

If a sequence of invalid images persists for over 0.5 seconds, the SDK warns of a significant gap. In addition to affecting the precision of the results, these gaps may also cause delays in the appearance of vital signs and impact confidence in the final results.

On a third occurrence of a 0.5-second gap, the SDK throws an error, stopping the session without final results. This behavior statistically improves measurement precision and encourages users to follow measurement guidance more effectively.

The table below summarizes the differences between setting Strict Measurement Guidance to true and false.

Strict Measurement Guidance	False (default)	True
Report Image Validity Info	Yes	Yes
Images with invalid Image Validity	Processed by SDK, as long as the face is detected (ROI image data exists)	Not processed by SDK
Periods over 0.5 sec with invalid Image Validity but with ROI image data	No warning is issued	Issues a warning when the user complies again with the guidelines
Impact on precision	Normal precision	Increased precision

License
The BiosenseSignal SDK uses a licensing mechanism to protect against unauthorized usage, and to grant measurement permissions specified in the license agreement.

License Types
In Web, the only available license type is Session: Sessions

Using the License Key
A valid license key must be provided in order to initiate a measurement session or activate a user.


TypeScript
TypeScript
import healthMonitorManager, {
    FaceSessionOptions
} from '@biosensesignal/web-sdk';

await healthMonitorManager.initialize({
    licenseKey,  
});

const options: FaceSessionOptions = { 
    input: video.current,
    cameraDeviceId: cameraId,
    processingTime,
    onVitalSign,
    onFinalResults,
    onError,
    onWarning,
    onStateChange,
    onImageData,
};

const faceSession = await healthMonitorManager.createFaceSession(options);  
WARNING

The application must secure the license key and prevent it from being exposed to 3rd parties.

Receiving License Updates
The SDK sends a LicenseInfo data that contains:

Offline Measurements Info - An object with information about offline measurements
Activation ID - A string with the license activation id.
The application can receive license-related messages by implementing the LicenseInfo callback interface:


TypeScript
TypeScript
import { 
    OfflineMeasurements
} from '@biosensesignal/web-sdk';
  
const onOfflineMeasurement = useCallback(
  (offlineMeasurements: OfflineMeasurements) => {
      console.log(`License Offline Measurements: 
          ${offlineMeasurements.totalMeasurements}/
          ${offlineMeasurements.remainingMeasurements}`);
  },
  [],
);

const onActivation = useCallback((activationId: string) => {
    console.log(`License Activation ID: ${activationId}`)
}, []);
License Server Network Routing
The SDK connects with the license server at https://licensing-api.biosensesignal.com. The traffic to this server is routed through a Cloudflare service. Since Cloudflare is inaccessible in certain countries, a custom workaround is available for these regions. Contact our customer support if the license server is unreachable in your target territories.

Sessions License
When sessions licensing is employed, the license server provides the SDK with an allocated number of measurements (or "quota") as specified in the license agreement.

The SDK requires an internet connection, allowing it to communicate with the license server in order to verify the license validity.

Measurement Consumption
Upon calling the start method the SDK instructs the license server to consume a single measurement and changes the session state from ACTIVE to MEASURING. If no measurements are available on the server, then the process will be aborted and the SDK will send an error and the session will transition back to STOPPING and ACTIVE state (see Session State).

Note

The SDK shares the activation ID with the application also when using a sessions license. However, the activation quota is unlimited when using this type of license.

Time Left for License Timer
To support cases where a session was consumed from the license quota, but the measurement failed for any reason like incoming phone call, the application can perform repeated measurements without consuming additional sessions from the license. A “session timeframe” timer is triggered when starting the first measurement. The timer is set initially to 9 minutes (540 seconds). During this timeframe the application can perform repeated measurements without consuming additional sessions from the license.

The following code can be used to update the device user interface or to decide if the user is still entitled to repeat a measurement. The Offline Measurements End Time is the time remaining on the timer. When this timer expires, then a starting new measurement will result consuming a new session from the license quota.

The application can receive the timer end time by implementing onOfflineMeasurement as part of LicenseInfo:


TypeScript
TypeScript
import { 
    OfflineMeasurements
} from '@biosensesignal/web-sdk';
  
const onOfflineMeasurement = useCallback(
  (offlineMeasurements: OfflineMeasurements) => {
      console.log(`License Offline Measurements: 
          ${offlineMeasurements.totalMeasurements}/
          ${offlineMeasurements.remainingMeasurements}`);
  },
  [],
);
Remaining Measurements and Offline Measurements
Note

This section is relevant only for licenses with a custom configuration of more than 1 offline measurement, as configured in the license server. This configuration requires the assistance of the support team.

By default, the licensing mechanism is configured to consume 1 measurement from the license's quota on the server upon calling the session start method. Some licenses are configured to fetch additional measurements from the server and store them locally on the SDK for future use. This allows the application to start additional sessions even if the device has no live internet access.

The following parameters indicate the status of the locally stored measurements:

Offline Measurements - The total number of measurements that can be stored locally on the device.
Remaining Measurements - The total number of measurements that were already downloaded from the server to the SDK and can be used in future sessions.
The application can receive the information regarding offline measurements by using LicenseInfo callback interface:


TypeScript
TypeScript
import { 
    OfflineMeasurements
} from '@biosensesignal/web-sdk';
  
const onOfflineMeasurement = useCallback(
  (offlineMeasurements: OfflineMeasurements) => {
      console.log(`License Offline Measurements: 
          ${offlineMeasurements.totalMeasurements}/
          ${offlineMeasurements.remainingMeasurements}`);
  },
  [],
);
