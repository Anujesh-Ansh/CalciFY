import { useEffect, useRef, useState } from 'react';
import { SWATCHES } from '@/constants';
import { ColorSwatch, Group } from '@mantine/core';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import Draggable from 'react-draggable';

interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

interface GeneratedResult {
    expression: string;
    answer: string;
}

const centerX = window.innerWidth / 2;
const centerY = window.innerHeight / 2;

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('rgb(255, 255, 255)');
    const [reset, setReset] = useState(false);
    const [result, setResult] = useState<GeneratedResult>();
    const [dictOfVars, setDictOfVars] = useState({});
    const [brushSize, setBrushSize] = useState(3);
    const [showMemo, setShowMemo] = useState(true);
    const [latexExpr, setLatexExpr] = useState<Array<string>>([]);
    const [latexPos, setLatexPos] = useState({ x: centerX - 100, y: centerY - 50 });

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setReset(false);
            setShowMemo(true);
            setLatexExpr([]);
            setResult(undefined);
            setDictOfVars({});
        }
    }, [reset]);

    useEffect(() => {
        if (latexExpr.length > 0 && window.MathJax) {
            setTimeout(() => {
                window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpr]);

    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expression, result.answer);
        }
    }, [result]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineCap = 'round';
            }
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/config/TeX-MML-AM_CHTML.js';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: {
                    inlineMath: [['$', '$'], ['\\(', '\\)']],
                    processEscapes: true
                }
            });
        };

        return () => {
            document.head.removeChild(script);
        };
    }, []);

    const sendData = async () => {
        const canvas = canvasRef.current;

        if (canvas) {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/calculate`, {
                image: canvas.toDataURL('image/png'),
                dict_of_vars: dictOfVars,
            });

            const resp = await response.data;
            console.log('Response', resp);
            resp.data.forEach((data: Response) => {
                if (data.assign) {
                    setDictOfVars(prev => ({
                        ...prev,
                        [data.expr]: data.result
                    }));
                }
            });

            const ctx = canvas.getContext('2d');
            const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    if (imageData.data[i + 3] > 0) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            setLatexPos({ x: centerX, y: centerY });
            resp.data.forEach((data: Response) => {
                setTimeout(() => {
                    setResult({
                        expression: data.expr,
                        answer: data.result
                    });
                }, 1000);
            });
        }
    };

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
                ctx.lineWidth = brushSize;
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                setIsDrawing(true);
                setShowMemo(false);
            }
        }
    };

    const stopDrawing = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.beginPath();
            }
        }
        setIsDrawing(false);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineWidth = brushSize;
                ctx.strokeStyle = color;
                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                ctx.stroke();
            }
        }
    };

    useEffect(() => {
        const handleKeyPress = (event: { shiftKey: boolean; metaKey: boolean; key: string }) => {
            if (event.shiftKey && event.metaKey && event.key === 'e') {
                setReset(true);
            }
            if (event.shiftKey && event.metaKey && event.key === 'o') {
                sendData();
            }
        };

        window.addEventListener('keydown', handleKeyPress);

        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, []);

    const renderLatexToCanvas = (expression: string, answer: string) => {
        const plainText = `${expression} = ${answer}`;
        setLatexExpr([...latexExpr, plainText]);
    
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };
    
    

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
                    <span style={{ marginTop: '10px' }}>{brushSize}px</span>
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
            {showMemo && (
                <div className='back'>
                    <h1 className='mem'>Start Scribbling....</h1>
                    <h1 className='highl'>Shift + Command + O → Run</h1>
                    <h1 className='highl'>Shift + Command + E → Reset</h1>
                </div>
            )}
            {latexExpr && latexExpr.map((latex, index) => (
                <Draggable
                    key={index}
                    defaultPosition={latexPos}
                    onStop={(_, data) => setLatexPos({ x: data.x, y: data.y })}
                >
                    <div
                        className="absolute p-4 bg-white text-black rounded shadow-lg"
                        style={{ fontSize: '2rem', padding: '20px', textAlign: 'center', minWidth: '200px' }} // Increase size and padding
                    >
                        <div>{latex}</div>
                    </div>
                </Draggable>
            ))}
            
        </>
    );
}
