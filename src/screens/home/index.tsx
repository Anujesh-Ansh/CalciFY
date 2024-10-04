import React, { useEffect, useRef, useState } from 'react';
import { SWATCHES } from '@/constants';
import { ColorSwatch, Group } from '@mantine/core';
import { Button } from '@/components/ui/button';
import axios from 'axios';

interface Response {
    expr: string;
    result: string;
    assign: string;
}

interface GeneratedResult {
    expression: string;
    answer: string;
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('rgb(255,255,255)');
    const [reset, setReset] = useState(false);
    const [result, setResult] = useState<GeneratedResult>();
    const [dictOfVars, setDictOfVars] = useState({});
    const [brushSize, setBrushSize] = useState(3); // Default brush size
    const [showMemo, setShowMemo] = useState(true); // State to show/hide bac

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setReset(false);
            setShowMemo(true);
        }
    }, [reset]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (canvas) {
            // Set canvas dimensions to fill the screen
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineCap = 'round'; // Smooth line endings
            }
        }
    }, []); // Set dimensions only once

    
    const sendData = async () => {
        const canvas = canvasRef.current;
        
        if (canvas) {
            const response = await axios({
                method: 'post',
                url: `${import.meta.env.VITE_API_URL}/calculate`,
                data: {
                    image: canvas.toDataURL('image/png'),
                    dict_of_vars: dictOfVars,
                }
            });
            
            const resp = await response.data;
            console.log('Response:', resp);
        }
    }
    
    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };
    
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineWidth = brushSize; // Set the current brush size when starting to draw
                ctx.strokeStyle = color; // Set the current color when starting to draw
                ctx.beginPath();
                ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                setIsDrawing(true);
                setShowMemo(false); // Hide the memo when drawing starts
            }
        }
    };
    
    const stopDrawing = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.beginPath(); // Reset the path
            }
        }
        setIsDrawing(false);
    };
    
    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return; // Only draw when the mouse is pressed down
        
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineWidth = brushSize; // Update the stroke width
                ctx.strokeStyle = color; // Update the stroke color
                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                ctx.stroke(); // Draw the line
            }
        }
    };
    
    useEffect(() => {
        const handleKeyPress = (event: { shiftKey: any; metaKey: any; key: string; }) => {
            if (event.shiftKey && event.metaKey && event.key === 'e') {
                // Shift + Command + E for Reset
                setReset(true);
            }
            if (event.shiftKey && event.metaKey && event.key === 'n') {
                // Shift + Command + N for Run
                sendData();
            }
        };
    
        // Add event listener for keypress
        window.addEventListener('keydown', handleKeyPress);
    
        // Cleanup the event listener on component unmount
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [setReset, sendData]);


    return (
        <>
            <div className='grid-container'>
                <Button
                    onClick={sendData}
                    className='custom-button z-20 bg-black text-white'
                    variant='default'
                    color='black'
                >
                    Run
                </Button>

                <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
                    <input
                        type="range"
                        min="1"
                        max="50"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="range-slider"
                    />
                    <span style={{ marginTop: '10px' }}>{brushSize}px</span> {/* Display current brush size */}
                </div>
                
                <Group className='color-swatch-group z-20'>
                    {SWATCHES.map((swatchColor: string) => (
                        <ColorSwatch
                            key={swatchColor}
                            color={swatchColor}
                            onClick={() => setColor(swatchColor)}
                            className='color-swatch'
                        />
                    ))}
                </Group>
                
                <Button
                    onClick={() => { setReset(true) }}
                    className='custom-button z-20 bg-black text-white'
                    variant='default'
                    color='black'
                >
                    Reset
                </Button>
                
            </div>
            <canvas
                ref={canvasRef}
                id="canvas"
                className="absolute top-0 left-0 w-full h-full bg-black"
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseMove={draw}
                onMouseLeave={stopDrawing}
            />
            {showMemo && ( // Conditionally render the back div
                <div className='back'>
                    <h1 className='mem'>Start Scribbling....</h1>
                    <h1 className='highl'>Shift + Command + N → Run</h1>
                    <h1 className='highl'>Shift + Command + E → Reset</h1>

                </div>
            )}
        </>
    );
}
