Creating a Preview for the User
As part of your application, it is recommended to present the user with a camera preview, as it helps the user to center his/her face on the camera screen. The following code can be used to create a preview and present it to the user.

Note

Unlike native SDKs, the camera preview is rendered directly on the Video element by the browser, rather than by the BiosenseSignal SDK.

1. Create a video element in your web application

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

export enum DeviceOrientation {
  PORTRAIT,            
  LANDSCAPE_LEFT,      
  LANDSCAPE_RIGHT    
}

Image Validity
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

Measurement Guidance
For precise face measurements with the BiosenseSignal SDK, the user is required to follow the image validation guidance. The SDK guides users to adhere to measurement guidelines, specifying exceptions in the Image Validity information. For detailed information on image validity, see the Image Validity page.

The SDK notifies the application about the image validity of each frame. It is highly recommended to prompt the user for any reported exception and instruct them to adhere to the best practices for taking a measurement. Utilize the sample application code for implementing image validity prompt notifications.

The SDK supports configuring whether to enable strict measurement guidance. This setting determines whether the SDK processes all video images when a face is detected (default behavior) or only processes images with valid image validity. In the following example, the strict measurement guidance is set to true:

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